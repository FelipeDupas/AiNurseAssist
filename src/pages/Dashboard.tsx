import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, FileText, TrendingUp, User, LogOut, Settings, Trash2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
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

const Dashboard = () => {
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [patientCount, setPatientCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  const medicoString = localStorage.getItem("medico");
  const medico = medicoString ? JSON.parse(medicoString) : {};

  useEffect(() => {
    if (!medico.id) {
      navigate("/login");
      return;
    }

    const fetchData = async () => {
      try {
        const [resCases, resPatients, resStats] = await Promise.all([
          fetch(`http://127.0.0.1:8000/cases/?owner_id=${medico.id}`),
          fetch(`http://127.0.0.1:8000/patients/?owner_id=${medico.id}`),
          fetch(`http://127.0.0.1:8000/dashboard/stats?owner_id=${medico.id}`),
        ]);

        if (resCases.ok) {
          const data = await resCases.json();
          setCases(data.sort((a: any, b: any) => b.id - a.id));
        }

        if (resPatients.ok) {
          const dataPatients = await resPatients.json();
          setPatientCount(dataPatients.length);
        }

        if (resStats.ok) {
          const dataStats = await resStats.json();
          setStats(dataStats);
        }
      } catch (error) {
        console.error("Erro ao buscar dados:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [medico.id, navigate]);

  const handleDeleteCase = async (caseId: number) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/cases/${caseId}?owner_id=${medico.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setCases((prev) => prev.filter((c: any) => c.id !== caseId));
        if (stats) {
          const newStats = await fetch(`http://127.0.0.1:8000/dashboard/stats?owner_id=${medico.id}`);
          if (newStats.ok) setStats(await newStats.json());
        }
      }
    } catch (error) {
      console.error("Erro na requisição:", error);
    } finally {
      setDeleteTargetId(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("medico");
    navigate("/login");
  };

  const totalCasos = cases.length;
  const analisesConcluidas = cases.filter((c: any) => c.status === "Analisado").length;

  const hasStats = stats && (
    stats.urgency.length > 0 ||
    stats.care_type.length > 0 ||
    stats.pathology.length > 0
  );

  const formattedDateData = stats?.cases_by_date.map((d) => ({
    ...d,
    date: new Date(d.date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
  })) ?? [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              AI Nurse Assist
            </h1>
            <nav className="hidden md:flex gap-4">
              <Button variant="ghost" onClick={() => navigate("/dashboard")} className="text-primary font-semibold">Home</Button>
              <Button variant="ghost" onClick={() => navigate("/patients")}>Pacientes</Button>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <p className="font-semibold text-foreground">{medico.nome}</p>
              <p className="text-sm text-muted-foreground">CRM: {medico.crm}</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center cursor-pointer">
                  <User className="w-5 h-5 text-primary-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/patients")} className="cursor-pointer">
                  <Users className="w-4 h-4 mr-2" /> Pacientes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/settings")} className="cursor-pointer">
                  <Settings className="w-4 h-4 mr-2" /> Configurações
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive">
                  <LogOut className="w-4 h-4 mr-2" /> Sair
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
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex gap-2"><Users className="w-4 h-4 text-primary"/>Total de Pacientes</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{patientCount}</p></CardContent>
          </Card>
          <Card className="shadow-sm border-l-4 border-l-secondary">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex gap-2"><FileText className="w-4 h-4 text-secondary"/>Casos Totais</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{totalCasos}</p></CardContent>
          </Card>
          <Card className="shadow-sm border-l-4 border-l-accent">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex gap-2"><TrendingUp className="w-4 h-4 text-accent"/>Triagens Realizadas</CardTitle></CardHeader>
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
              <Button className="w-full" onClick={() => navigate("/add-case")}><Plus className="mr-2" /> Novo Atendimento</Button>
            </CardContent>
          </Card>
          <Card className="shadow-md border-none">
            <CardHeader>
              <CardTitle>Prontuários</CardTitle>
              <CardDescription>Acesse a lista completa de pacientes cadastrados</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" onClick={() => navigate("/patients")}><Users className="mr-2" /> Gerenciar Pacientes</Button>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-sm mb-8">
          <CardHeader><CardTitle>Atendimentos Recentes</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm text-muted-foreground">
                    <th className="pb-3">Paciente</th>
                    <th className="pb-3">Data da Consulta</th>
                    <th className="pb-3">Urgência</th>
                    <th className="pb-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={4} className="text-center py-8">Carregando...</td></tr>
                  ) : cases.length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">Sem atendimentos registrados.</td></tr>
                  ) : (
                    cases.map((caso: any) => (
                      <tr key={caso.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="py-4 font-medium">{caso.patient_name}</td>
                        <td className="py-4 text-sm text-muted-foreground">{new Date(caso.created_at).toLocaleDateString('pt-BR')}</td>
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
                            className="text-destructive"
                            onClick={() => setDeleteTargetId(caso.id)}
                          >
                            <Trash2 className="w-4 h-4"/>
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {hasStats && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Análise Gráfica</h2>
            <div className="grid lg:grid-cols-3 gap-6">

              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Distribuição de Urgência</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={stats!.urgency}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        label={({ name, value }) => `${name}: ${value}`}
                        labelLine={false}
                      >
                        {stats!.urgency.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={URGENCY_COLORS[entry.name] ?? "#94a3b8"} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number, name: string) => [value, name]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Atendimentos por Tipo</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={stats!.care_type} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Casos por Dia — Últimos 7 Dias</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={formattedDateData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="total" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

            </div>
          </div>
        )}
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
