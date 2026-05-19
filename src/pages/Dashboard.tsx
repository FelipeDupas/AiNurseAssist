import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Plus, FileText, TrendingUp, User, LogOut, Settings, Trash2, Users,
  Search, ChevronUp, ChevronDown, ChevronsUpDown, ClipboardList,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

interface DashboardStats {
  urgency: Array<{ name: string; value: number }>;
  care_type: Array<{ name: string; value: number }>;
  pathology: Array<{ name: string; value: number }>;
  cases_by_date: Array<{ date: string; total: number }>;
}

const URGENCY_COLORS: Record<string, string> = {
  Alta: "#ef4444",
  Média: "#f59e0b",
  Baixa: "#22c55e",
  Indefinida: "#94a3b8",
};

const URGENCY_ORDER: Record<string, number> = { Alta: 0, Média: 1, Baixa: 2, Indefinida: 3 };
const ITEMS_PER_PAGE = 10;

const Dashboard = () => {
  const navigate = useNavigate();
  const [cases, setCases] = useState<any[]>([]);
  const [patientCount, setPatientCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  // Busca global
  const [globalSearch, setGlobalSearch] = useState("");
  // Ordenação
  const [sortColumn, setSortColumn] = useState<"created_at" | "urgency">("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  // Paginação
  const [currentPage, setCurrentPage] = useState(1);

  const medicoString = localStorage.getItem("medico");
  const medico = medicoString ? JSON.parse(medicoString) : {};

  useEffect(() => {
    if (!medico.id) { navigate("/login"); return; }

    const fetchData = async () => {
      try {
        const [resCases, resPatients, resStats] = await Promise.all([
          fetch(`${API_URL}/cases/?owner_id=${medico.id}`),
          fetch(`${API_URL}/patients/?owner_id=${medico.id}`),
          fetch(`${API_URL}/dashboard/stats?owner_id=${medico.id}`),
        ]);
        if (resCases.ok) { const data = await resCases.json(); setCases(data.sort((a: any, b: any) => b.id - a.id)); }
        if (resPatients.ok) { const dp = await resPatients.json(); setPatientCount(dp.length); }
        if (resStats.ok) { const ds = await resStats.json(); setStats(ds); }
      } catch (error) { console.error("Erro ao buscar dados:", error); }
      finally { setLoading(false); }
    };

    fetchData();
  }, [medico.id, navigate]);

  const handleDeleteCase = async (caseId: number) => {
    try {
      const response = await fetch(`${API_URL}/cases/${caseId}?owner_id=${medico.id}`, { method: "DELETE" });
      if (response.ok) {
        setCases((prev) => prev.filter((c: any) => c.id !== caseId));
        if (stats) { const ns = await fetch(`${API_URL}/dashboard/stats?owner_id=${medico.id}`); if (ns.ok) setStats(await ns.json()); }
      }
    } catch (error) { console.error("Erro na requisição:", error); }
    finally { setDeleteTargetId(null); }
  };

  const handleLogout = () => { localStorage.removeItem("medico"); navigate("/login"); };

  // --- Helpers ---
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

  // --- Filtro ---
  const casosFiltrados = cases.filter((c: any) => {
    if (!globalSearch.trim()) return true;
    const q = globalSearch.toLowerCase();
    const cpfDigits = (c.cpf || "").replace(/\D/g, "");
    const queryDigits = q.replace(/\D/g, "");
    return (
      (c.patient_name || "").toLowerCase().includes(q) ||
      (cpfDigits && queryDigits && cpfDigits.includes(queryDigits))
    );
  });

  // --- Ordenação ---
  const casosOrdenados = [...casosFiltrados].sort((a: any, b: any) => {
    if (sortColumn === "created_at") {
      const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortDir === "asc" ? diff : -diff;
    }
    const ua = URGENCY_ORDER[a.ai_analysis_json?.urgency ?? "Indefinida"] ?? 3;
    const ub = URGENCY_ORDER[b.ai_analysis_json?.urgency ?? "Indefinida"] ?? 3;
    return sortDir === "asc" ? ua - ub : ub - ua;
  });

  // --- Paginação ---
  const totalPages = Math.max(1, Math.ceil(casosOrdenados.length / ITEMS_PER_PAGE));
  const casosPaginados = casosOrdenados.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const toggleSort = (col: "created_at" | "urgency") => {
    if (sortColumn === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortColumn(col); setSortDir("desc"); }
    setCurrentPage(1);
  };

  const SortIcon = ({ col }: { col: "created_at" | "urgency" }) => {
    if (sortColumn !== col) return <ChevronsUpDown className="w-3 h-3 opacity-40 inline ml-1" />;
    return sortDir === "asc"
      ? <ChevronUp className="w-3 h-3 inline ml-1" />
      : <ChevronDown className="w-3 h-3 inline ml-1" />;
  };

  const totalCasos = cases.length;
  const analisesConcluidas = cases.filter((c: any) =>
    c.status === "Analisado" || c.status === "Revisado pelo Médico"
  ).length;

  const hasStats = stats && (stats.urgency.length > 0 || stats.care_type.length > 0 || stats.pathology.length > 0);
  const formattedDateData = stats?.cases_by_date.map((d) => ({
    ...d,
    date: new Date(d.date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
  })) ?? [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center gap-4">
          <div className="flex items-center gap-6 shrink-0">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              AI Nurse Assist
            </h1>
            <nav className="hidden md:flex gap-4">
              <Button variant="ghost" onClick={() => navigate("/dashboard")} className="text-primary font-semibold">Home</Button>
              <Button variant="ghost" onClick={() => navigate("/patients")}>Pacientes</Button>
            </nav>
          </div>

          {/* Busca global */}
          <div className="relative flex-1 max-w-sm hidden md:flex items-center">
            <Search className="absolute left-3 w-4 h-4 text-muted-foreground pointer-events-none" aria-hidden="true" />
            <Input
              placeholder="Buscar por nome ou CPF..."
              value={globalSearch}
              onChange={(e) => { setGlobalSearch(e.target.value); setCurrentPage(1); }}
              className="pl-9 h-9 text-sm"
              aria-label="Busca global de pacientes por nome ou CPF"
            />
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right hidden md:block">
              <p className="font-semibold text-foreground">{medico.nome}</p>
              <p className="text-sm text-muted-foreground">CRM: {medico.crm}</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  aria-label="Acessar minha conta"
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <User className="w-5 h-5 text-primary-foreground" aria-hidden="true" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/patients")} className="cursor-pointer">
                  <Users className="w-4 h-4 mr-2" aria-hidden="true" /> Pacientes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/settings")} className="cursor-pointer">
                  <Settings className="w-4 h-4 mr-2" aria-hidden="true" /> Configurações
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive">
                  <LogOut className="w-4 h-4 mr-2" aria-hidden="true" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Bem-vindo, Dr. {medico.nome}</h2>
          <p className="text-muted-foreground">Gerencie prontuários e triagens.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-sm border-l-4 border-l-primary">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex gap-2"><Users className="w-4 h-4 text-primary" aria-hidden="true" />Total de Pacientes</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{patientCount}</p></CardContent>
          </Card>
          <Card className="shadow-sm border-l-4 border-l-secondary">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex gap-2"><FileText className="w-4 h-4 text-secondary" aria-hidden="true" />Casos Totais</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{totalCasos}</p></CardContent>
          </Card>
          <Card className="shadow-sm border-l-4 border-l-accent">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex gap-2"><TrendingUp className="w-4 h-4 text-accent" aria-hidden="true" />Triagens Realizadas</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{analisesConcluidas}</p></CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="shadow-md bg-gradient-to-br from-primary/5 to-secondary/5 border-none">
            <CardHeader>
              <CardTitle>Nova Triagem</CardTitle>
              <CardDescription>Análise clínica inteligente para novos casos</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => navigate("/add-case")}>
                <Plus className="mr-2" aria-hidden="true" /> Novo Atendimento
              </Button>
            </CardContent>
          </Card>
          <Card className="shadow-md border-none">
            <CardHeader>
              <CardTitle>Prontuários</CardTitle>
              <CardDescription>Acesse a lista completa de pacientes cadastrados</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" onClick={() => navigate("/patients")}>
                <Users className="mr-2" aria-hidden="true" /> Gerenciar Pacientes
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-sm mb-8">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle>Atendimentos Recentes</CardTitle>
              {globalSearch && casosFiltrados.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  {casosFiltrados.length} resultado(s) para "{globalSearch}"
                  {" · "}
                  <button
                    className="text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                    onClick={() => navigate(`/patients?q=${encodeURIComponent(globalSearch)}`)}
                  >
                    Ver todos
                  </button>
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm text-muted-foreground">
                    <th className="pb-3">Paciente</th>
                    <th className="pb-3">
                      <button
                        className="flex items-center gap-0.5 hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1"
                        onClick={() => toggleSort("created_at")}
                        aria-label="Ordenar por data"
                      >
                        Data <SortIcon col="created_at" />
                      </button>
                    </th>
                    <th className="pb-3">
                      <button
                        className="flex items-center gap-0.5 hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1"
                        onClick={() => toggleSort("urgency")}
                        aria-label="Ordenar por urgência"
                      >
                        Urgência <SortIcon col="urgency" />
                      </button>
                    </th>
                    <th className="pb-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">Carregando...</td></tr>
                  ) : cases.length === 0 ? (
                    /* Estado vazio — nenhum caso cadastrado */
                    <tr>
                      <td colSpan={4}>
                        <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
                          <ClipboardList className="w-12 h-12 text-muted-foreground/30" aria-hidden="true" />
                          <p className="font-medium text-muted-foreground">Nenhum atendimento registrado ainda.</p>
                          <p className="text-sm text-muted-foreground/70">Comece criando o primeiro caso clínico.</p>
                          <Button className="mt-2" onClick={() => navigate("/add-case")}>
                            <Plus className="mr-2 w-4 h-4" aria-hidden="true" /> Iniciar primeiro atendimento
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ) : casosOrdenados.length === 0 ? (
                    /* Estado vazio — nenhum resultado de busca */
                    <tr>
                      <td colSpan={4}>
                        <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
                          <Search className="w-10 h-10 text-muted-foreground/30" aria-hidden="true" />
                          <p className="font-medium text-muted-foreground">Nenhum paciente encontrado para "{globalSearch}".</p>
                          <button
                            className="text-sm text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                            onClick={() => { setGlobalSearch(""); setCurrentPage(1); }}
                          >
                            Limpar busca
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    casosPaginados.map((caso: any) => (
                      <tr key={caso.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="py-4 font-medium">{caso.patient_name}</td>
                        <td
                          className="py-4 text-sm text-muted-foreground"
                          title={formatarDataHora(caso.created_at)}
                        >
                          {tempoRelativo(caso.created_at)}
                        </td>
                        <td className="py-4">
                          <Badge variant={caso.ai_analysis_json?.urgency === "Alta" ? "destructive" : "secondary"}>
                            {caso.ai_analysis_json?.urgency || "Pendente"}
                          </Badge>
                        </td>
                        <td className="py-4 text-right flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => navigate(`/case/${caso.id}`)}>Detalhes</Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive focus-visible:ring-2 focus-visible:ring-ring"
                            aria-label={`Excluir caso de ${caso.patient_name}`}
                            onClick={() => setDeleteTargetId(caso.id)}
                          >
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t text-sm text-muted-foreground">
                <span>Página {currentPage} de {totalPages}</span>
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

        {hasStats ? (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Análise Gráfica</h2>
            <div className="grid lg:grid-cols-3 gap-6">

              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Distribuição de Urgência</CardTitle>
                </CardHeader>
                <CardContent>
                  {stats!.urgency.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={stats!.urgency} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}
                          label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                          {stats!.urgency.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={URGENCY_COLORS[entry.name] ?? "#94a3b8"} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number, name: string) => [value, name]} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[220px] flex flex-col items-center justify-center text-muted-foreground/50 gap-2">
                      <TrendingUp className="w-8 h-8" aria-hidden="true" />
                      <p className="text-sm">Dados insuficientes</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Atendimentos por Tipo</CardTitle>
                </CardHeader>
                <CardContent>
                  {stats!.care_type.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={stats!.care_type} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[220px] flex flex-col items-center justify-center text-muted-foreground/50 gap-2">
                      <FileText className="w-8 h-8" aria-hidden="true" />
                      <p className="text-sm">Dados insuficientes</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Casos por Dia — Últimos 7 Dias</CardTitle>
                </CardHeader>
                <CardContent>
                  {formattedDateData.some(d => d.total > 0) ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={formattedDateData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="total" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[220px] flex flex-col items-center justify-center text-muted-foreground/50 gap-2">
                      <TrendingUp className="w-8 h-8" aria-hidden="true" />
                      <p className="text-sm">Nenhum caso nos últimos 7 dias</p>
                    </div>
                  )}
                </CardContent>
              </Card>

            </div>
          </div>
        ) : !loading && totalCasos === 0 ? (
          /* Estado vazio dos gráficos */
          <div className="rounded-xl border border-dashed border-muted-foreground/25 p-10 text-center">
            <TrendingUp className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" aria-hidden="true" />
            <p className="font-medium text-muted-foreground">Os gráficos aparecerão após o registro dos primeiros casos.</p>
          </div>
        ) : null}
      </main>

      <AlertDialog open={deleteTargetId !== null} onOpenChange={(open) => { if (!open) setDeleteTargetId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O caso clínico será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTargetId !== null && handleDeleteCase(deleteTargetId)}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Dashboard;
