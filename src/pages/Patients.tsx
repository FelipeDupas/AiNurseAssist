import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { API_URL } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Search, Eye, Stethoscope, ChevronUp, ChevronDown, ChevronsUpDown, ClipboardList, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Case {
  id: number;
  patient_name: string;
  created_at: string;
  status: string;
  care_type?: string;
  cpf?: string;
  ai_analysis_json?: {
    urgency?: string;
  };
}

const URGENCY_ORDER: Record<string, number> = { Alta: 0, Média: 1, Baixa: 2, Indefinida: 3 };
const STATUS_ORDER: Record<string, number> = {
  "Erro na Análise": 0,
  "Pendente": 1,
  "Em Análise": 2,
  "Analisado": 3,
  "Revisado pelo Médico": 4,
};
const ITEMS_PER_PAGE = 10;

const careTypeBadgeClasse = (careType?: string) => {
  if (careType === "Urgência") return "bg-red-100 text-red-800 border-red-300";
  if (careType === "Pediátrico") return "bg-purple-100 text-purple-800 border-purple-300";
  return "bg-gray-100 text-gray-700 border-gray-300";
};

const statusClasse = (status: string) => {
  switch (status) {
    case "Analisado":            return "bg-green-100 text-green-800 border-green-300";
    case "Revisado pelo Médico": return "bg-purple-100 text-purple-800 border-purple-300";
    case "Erro na Análise":      return "bg-red-100 text-red-800 border-red-300";
    case "Em Análise":           return "bg-blue-100 text-blue-800 border-blue-300";
    default:                     return "bg-gray-100 text-gray-700 border-gray-300";
  }
};

const urgencyClasse = (urgency: string) => {
  if (urgency === "Alta")  return "bg-red-100 text-red-800 border-red-300";
  if (urgency === "Média") return "bg-yellow-100 text-yellow-800 border-yellow-300";
  if (urgency === "Baixa") return "bg-green-100 text-green-800 border-green-300";
  return "bg-gray-100 text-gray-700 border-gray-300";
};

const Patients = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [deleteTargetName, setDeleteTargetName] = useState("");
  // Busca — inicializada pelo parâmetro de URL ?q= (busca global do Dashboard)
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  // Ordenação
  const [sortColumn, setSortColumn] = useState<"created_at" | "urgency" | "status">("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  // Paginação
  const [currentPage, setCurrentPage] = useState(1);

  const medicoString = localStorage.getItem("medico");
  const medico = medicoString ? JSON.parse(medicoString) : null;

  useEffect(() => {
    if (!medico?.id) { navigate("/login"); return; }
    const fetchCases = async () => {
      try {
        const response = await fetch(`${API_URL}/cases/?owner_id=${medico.id}`);
        if (response.ok) { const data = await response.json(); setCases(data.sort((a: Case, b: Case) => b.id - a.id)); }
      } catch (error) { console.error("Erro ao buscar pacientes:", error); }
      finally { setLoading(false); }
    };
    fetchCases();
  }, [medico?.id, navigate]);

  // Helpers
  const tempoRelativo = (iso: string) => {
    if (!iso) return "—";
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return "há poucos segundos";
    if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`;
    if (diff < 172800) return "ontem";
    if (diff < 604800) return `há ${Math.floor(diff / 86400)} dias`;
    return new Date(iso).toLocaleDateString("pt-BR");
  };

  const formatarDataHora = (iso: string) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  // Filtro
  const filtered = cases.filter(patient => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q ||
      patient.patient_name.toLowerCase().includes(q) ||
      ((patient.cpf || "").replace(/\D/g, "")).includes(q.replace(/\D/g, ""));

    const matchesStatus = statusFilter === "all" ||
      (statusFilter === "analisado"  && patient.status === "Analisado") ||
      (statusFilter === "pendente"   && patient.status === "Pendente") ||
      (statusFilter === "em_analise" && patient.status === "Em Análise") ||
      (statusFilter === "erro"       && patient.status === "Erro na Análise") ||
      (statusFilter === "revisado"   && patient.status === "Revisado pelo Médico");

    let matchesDate = true;
    const caseDate = new Date(patient.created_at);
    const today = new Date();
    if (dateFilter === "today") {
      matchesDate = caseDate.toDateString() === today.toDateString();
    } else if (dateFilter === "week") {
      const d = new Date(); d.setDate(today.getDate() - 7);
      matchesDate = caseDate >= d;
    } else if (dateFilter === "month") {
      const d = new Date(); d.setMonth(today.getMonth() - 1);
      matchesDate = caseDate >= d;
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  // Ordenação
  const sorted = [...filtered].sort((a, b) => {
    let diff = 0;
    if (sortColumn === "created_at") {
      diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    } else if (sortColumn === "urgency") {
      const ua = URGENCY_ORDER[a.ai_analysis_json?.urgency ?? "Indefinida"] ?? 3;
      const ub = URGENCY_ORDER[b.ai_analysis_json?.urgency ?? "Indefinida"] ?? 3;
      diff = ua - ub;
    } else if (sortColumn === "status") {
      const sa = STATUS_ORDER[a.status] ?? 0;
      const sb = STATUS_ORDER[b.status] ?? 0;
      diff = sa - sb;
    }
    return sortDir === "asc" ? diff : -diff;
  });

  // Paginação
  const totalPages = Math.max(1, Math.ceil(sorted.length / ITEMS_PER_PAGE));
  const paginated = sorted.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const toggleSort = (col: "created_at" | "urgency" | "status") => {
    if (sortColumn === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortColumn(col); setSortDir("desc"); }
    setCurrentPage(1);
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortColumn !== col) return <ChevronsUpDown className="w-3 h-3 opacity-40 inline ml-1" />;
    return sortDir === "asc"
      ? <ChevronUp className="w-3 h-3 inline ml-1" />
      : <ChevronDown className="w-3 h-3 inline ml-1" />;
  };

  const handleDeleteCase = async (caseId: number) => {
    try {
      const response = await fetch(`${API_URL}/cases/${caseId}?owner_id=${medico?.id}`, { method: "DELETE" });
      if (response.ok) {
        setCases(prev => prev.filter(c => c.id !== caseId));
      }
    } catch (error) {
      console.error("Erro ao excluir caso:", error);
    } finally {
      setDeleteTargetId(null);
      setDeleteTargetName("");
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleFilterChange = (setter: (v: string) => void) => (value: string) => {
    setter(value);
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/dashboard")} className="gap-2 shrink-0">
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Voltar ao Dashboard
          </Button>

          {/* Busca global no cabeçalho */}
          <div className="relative flex-1 max-w-sm hidden md:flex items-center">
            <Search className="absolute left-3 w-4 h-4 text-muted-foreground pointer-events-none" aria-hidden="true" />
            <Input
              placeholder="Buscar por nome ou CPF..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 h-9 text-sm"
              aria-label="Buscar paciente por nome ou CPF"
            />
          </div>

          <div className="flex items-center gap-2 ml-auto shrink-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Stethoscope className="w-4 h-4 text-primary-foreground" aria-hidden="true" />
            </div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              AI Nurse Assist
            </h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Gerenciar Pacientes</h1>
          <p className="text-muted-foreground">Visualize e gerencie todos os casos de pacientes</p>
        </div>

        <Card className="shadow-[var(--shadow-elevated)] mb-6">
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
            <CardDescription>Filtre os pacientes por nome, CPF, data ou status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              {/* Busca visível em mobile (no header está hidden em telas pequenas) */}
              <div className="relative md:hidden">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  placeholder="Buscar por nome ou CPF"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10"
                  aria-label="Buscar paciente por nome ou CPF"
                />
              </div>

              <Select value={dateFilter} onValueChange={handleFilterChange(setDateFilter)}>
                <SelectTrigger aria-label="Filtrar por data">
                  <SelectValue placeholder="Filtrar por data" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as datas</SelectItem>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="week">Última semana</SelectItem>
                  <SelectItem value="month">Último mês</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={handleFilterChange(setStatusFilter)}>
                <SelectTrigger aria-label="Filtrar por status">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="em_analise">Em Análise</SelectItem>
                  <SelectItem value="analisado">Analisado</SelectItem>
                  <SelectItem value="erro">Erro na Análise</SelectItem>
                  <SelectItem value="revisado">Revisado pelo Médico</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-[var(--shadow-card)]">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle>Lista de Pacientes</CardTitle>
              <CardDescription>{sorted.length} paciente(s) encontrado(s)</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-semibold">Paciente</th>
                    <th className="pb-3 font-semibold">
                      <button
                        className="flex items-center hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1"
                        onClick={() => toggleSort("created_at")}
                        aria-label="Ordenar por data"
                      >
                        Data <SortIcon col="created_at" />
                      </button>
                    </th>
                    <th className="pb-3 font-semibold">Tipo</th>
                    <th className="pb-3 font-semibold">
                      <button
                        className="flex items-center hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1"
                        onClick={() => toggleSort("status")}
                        aria-label="Ordenar por status"
                      >
                        Status <SortIcon col="status" />
                      </button>
                    </th>
                    <th className="pb-3 font-semibold">
                      <button
                        className="flex items-center hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1"
                        onClick={() => toggleSort("urgency")}
                        aria-label="Ordenar por urgência"
                      >
                        Urgência <SortIcon col="urgency" />
                      </button>
                    </th>
                    <th className="pb-3 font-semibold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</td></tr>
                  ) : cases.length === 0 ? (
                    /* Estado vazio — nenhum caso cadastrado */
                    <tr>
                      <td colSpan={6}>
                        <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
                          <ClipboardList className="w-12 h-12 text-muted-foreground/30" aria-hidden="true" />
                          <p className="font-medium text-muted-foreground">Nenhum paciente cadastrado ainda.</p>
                          <p className="text-sm text-muted-foreground/70">Os casos aparecem aqui após o registro do primeiro atendimento.</p>
                          <Button className="mt-2" onClick={() => navigate("/add-case")}>Registrar primeiro atendimento</Button>
                        </div>
                      </td>
                    </tr>
                  ) : sorted.length === 0 ? (
                    /* Estado vazio — nenhum resultado para os filtros aplicados */
                    <tr>
                      <td colSpan={6}>
                        <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
                          <Search className="w-10 h-10 text-muted-foreground/30" aria-hidden="true" />
                          <p className="font-medium text-muted-foreground">Nenhum resultado para os filtros aplicados.</p>
                          <button
                            className="text-sm text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                            onClick={() => { setSearchQuery(""); setStatusFilter("all"); setDateFilter("all"); setCurrentPage(1); }}
                          >
                            Limpar todos os filtros
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginated.map((patient) => {
                      const urgency = patient.ai_analysis_json?.urgency || "Indefinida";
                      return (
                        <tr key={patient.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                          <td className="py-4 font-medium">{patient.patient_name}</td>
                          <td
                            className="py-4 text-muted-foreground text-sm"
                            title={formatarDataHora(patient.created_at)}
                          >
                            {tempoRelativo(patient.created_at)}
                          </td>
                          <td className="py-4">
                            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${careTypeBadgeClasse(patient.care_type)}`}>
                              {patient.care_type ?? "—"}
                            </span>
                          </td>
                          <td className="py-4">
                            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusClasse(patient.status)}`}>
                              {patient.status}
                            </span>
                          </td>
                          <td className="py-4">
                            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${urgencyClasse(urgency)}`}>
                              {urgency}
                            </span>
                          </td>
                          <td className="py-4">
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/case/${patient.id}`)}
                                aria-label={`Ver detalhes de ${patient.patient_name}`}
                              >
                                <Eye className="w-4 h-4 mr-1" aria-hidden="true" />
                                Ver
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring"
                                aria-label={`Excluir caso de ${patient.patient_name}`}
                                onClick={() => { setDeleteTargetId(patient.id); setDeleteTargetName(patient.patient_name); }}
                              >
                                <Trash2 className="w-4 h-4" aria-hidden="true" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t text-sm text-muted-foreground">
                <span>Página {currentPage} de {totalPages} ({sorted.length} registros)</span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    aria-label="Página anterior"
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    aria-label="Próxima página"
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Modal de confirmação de exclusão */}
      <AlertDialog
        open={deleteTargetId !== null}
        onOpenChange={(open) => { if (!open) { setDeleteTargetId(null); setDeleteTargetName(""); } }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir caso clínico?</AlertDialogTitle>
            <AlertDialogDescription>
              O caso de <strong>{deleteTargetName}</strong> será removido permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTargetId !== null && handleDeleteCase(deleteTargetId)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Patients;
