import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import axios from 'axios';

interface Analisis {
  id: number;
  codigo: string;
  descripcion: string;
  estado: string;
  resultado: string | null;
  unidad?: string | null;
  referencia?: string | null;
  interpretacion?: string | null;
  observaciones?: string | null;
  fecha_resultado?: string | null;
  padre?: number | null;
}

interface Paciente {
  nombre: string;
  apellido: string;
  dni: number;
  mutual?: string;
}

interface Orden {
  id: number;
  nro_orden: string;
  estado: string;
  fecha_ingreso: string;
  urgente: boolean;
  paciente: Paciente;
  analisis: Analisis[];
}

export default function OrdenDetalle() {
  const { id } = useParams();
  const [orden, setOrden] = useState<Orden | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editando, setEditando] = useState<Record<number, boolean>>({});
  const [resultados, setResultados] = useState<Record<number, string>>({});
  const [estados, setEstados] = useState<Record<number, string>>({});
  const [guardando, setGuardando] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const fetchOrden = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/bioquimico/orden/${id}`);
        const { orden: ordenData } = res.data;
        setOrden(ordenData);

        const ed: Record<number, boolean> = {};
        const resEdit: Record<number, string> = {};
        const estEdit: Record<number, string> = {};

        (ordenData.analisis || []).forEach((a: Analisis) => {
          ed[a.id] = false;
          resEdit[a.id] = a.resultado || '';
          estEdit[a.id] = a.estado;
        });

        setEditando(ed);
        setResultados(resEdit);
        setEstados(estEdit);
      } catch (err) {
        console.error("❌ Error al cargar orden:", err);
        setError('No se pudo cargar la orden.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrden();
  }, [id]);

  const formatFecha = (fecha: string | null) => {
    if (!fecha) return '—';
    return new Date(fecha).toLocaleDateString('es-AR');
  };

  const handleGuardar = async (analisisId: number) => {
    const resultado = resultados[analisisId]?.trim();
    const estado = estados[analisisId];

    if (!resultado) {
      alert('El resultado no puede estar vacío.');
      return;
    }

    try {
      setGuardando(prev => ({ ...prev, [analisisId]: true }));
      await axios.post(`http://localhost:5000/api/bioquimico/analisis/${analisisId}/resultado`, {
        resultado,
        estado,
      });
      alert('✅ Resultado guardado correctamente');
      setEditando(prev => ({ ...prev, [analisisId]: false }));

      const res = await axios.get(`http://localhost:5000/api/bioquimico/orden/${id}`);
      setOrden(res.data.orden);
    } catch (error) {
      console.error('💥 Error al guardar resultado:', error);
      alert('❌ Error al guardar resultado');
    } finally {
      setGuardando(prev => ({ ...prev, [analisisId]: false }));
    }
  };

  const agruparPorPadre = (analisis: Analisis[]) => {
    const padres: Analisis[] = analisis.filter(a => !a.padre);
    const hijos: Analisis[] = analisis.filter(a => a.padre);
    const agrupado = padres.map(padre => ({
      ...padre,
      hijos: hijos.filter(h => h.padre === parseInt(padre.codigo))
    }));
    return agrupado;
  };

  if (loading) return <p className="p-6">⏳ Cargando orden...</p>;
  if (error) return <p className="text-red-600 p-6">{error}</p>;
  if (!orden) return <p className="p-6">Orden no encontrada.</p>;

  const analisisAgrupados = agruparPorPadre(orden.analisis);

  return (
    <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow mt-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">
        🧬 Detalle de Orden #{orden.nro_orden}
      </h1>

      <div className="mb-4 text-sm text-gray-700">
        <p><strong>Paciente:</strong> {orden.paciente.nombre} {orden.paciente.apellido}</p>
        <p><strong>DNI:</strong> {orden.paciente.dni}</p>
        <p><strong>Mutual:</strong> {orden.paciente.mutual || '—'}</p>
        <p><strong>Estado:</strong> {orden.estado.toUpperCase()}</p>
        <p><strong>Urgente:</strong> {orden.urgente ? 'Sí 🚨' : 'No'}</p>
        <p><strong>Fecha de Ingreso:</strong> {formatFecha(orden.fecha_ingreso)}</p>
      </div>

      <h2 className="text-lg font-semibold text-gray-800 mb-2">🔬 Análisis Solicitados</h2>

      {analisisAgrupados.map((grupo) => (
        <div key={grupo.codigo} className="mb-6 border border-gray-200 rounded-lg">
          <div className="bg-gray-100 p-2 font-bold">
            🧪 {grupo.descripcion}
          </div>

          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-4 py-2">Descripción</th>
                <th className="px-4 py-2">Valor Hallado</th>
                <th className="px-4 py-2">Valor de Referencia</th>
                <th className="px-4 py-2">Unidad</th>
                <th className="px-4 py-2 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {grupo.hijos && grupo.hijos.map((a) => (
                <tr key={a.id} className="border-t">
                  <td className="px-4 py-2">{a.descripcion}</td>
                  <td className="px-4 py-2">
                    {editando[a.id] ? (
                      <textarea
                        rows={2}
                        className="border w-full rounded px-2 py-1"
                        value={resultados[a.id]}
                        onChange={(e) => setResultados(prev => ({ ...prev, [a.id]: e.target.value }))}
                      />
                    ) : (
                      a.resultado || <span className="italic text-gray-400">Sin resultado</span>
                    )}
                  </td>
                  <td className="px-4 py-2">{a.referencia || '—'}</td>
                  <td className="px-4 py-2">{a.unidad || '—'}</td>
                  <td className="px-4 py-2 text-center">
                    {editando[a.id] ? (
                      <div className="space-x-2">
                        <button
                          className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                          onClick={() => handleGuardar(a.id)}
                          disabled={guardando[a.id]}
                        >
                          {guardando[a.id] ? 'Guardando...' : 'Guardar'}
                        </button>
                        <button
                          className="bg-gray-300 text-gray-800 px-3 py-1 rounded hover:bg-gray-400"
                          onClick={() => setEditando(prev => ({ ...prev, [a.id]: false }))}
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        className="text-blue-600 hover:underline"
                        onClick={() => setEditando(prev => ({ ...prev, [a.id]: true }))}
                      >
                        Editar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
