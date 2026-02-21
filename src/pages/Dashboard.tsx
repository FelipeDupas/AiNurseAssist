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

const Dashboard = () => {
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [patientCount, setPatientCount] = useState(0); // Novo estado para contagem de pacientes
  const [loading, setLoading] = useState(true);
  
  const medicoString = localStorage.getItem("medico");
  const medico = medicoString ? JSON.parse(medicoString) : {};

  useEffect(() => {
    if (!medico.id) {
      navigate("/login");
      return;
    }

    const fetchData = async () => {
      try {
        // Busca os Casos
        const resCases = await fetch(`http://127.0.0.1:8000/cases/?owner_id=${medico.id}`);
        if (resCases.ok) {
          const data = await resCases.json();
          setCases(data.sort((a: any, b: any) => b.id - a.id));
        }

        // Busca a contagem de Pacientes únicos (Nova rota que criamos no main.py)
        const resPatients = await fetch(`http://127.0.0.1:8000/patients/?owner_id=${medico.id}`);
        if (resPatients.ok) {
          const dataPatients = await resPatients.json();
          setPatientCount(dataPatients.length);
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
    if (!confirm("Tem certeza que deseja excluir este caso clínico?")) return;

    try {
      const response = await fetch(`http://127.0.0.1:8000/cases/${caseId}?owner_id=${medico.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setCases((prev) => prev.filter((c: any) => c.id !== caseId));
      }
    } catch (error) {
      console.error("Erro na requisição:", error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("medico");
    navigate("/login");
  };

  // Cálculos baseados nos dados reais do banco
  const totalCasos = cases.length;
  const analisesConcluidas = cases.filter((c: any) => c.status === "Analisado").length;

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

        {/* CARDS COM MÉTRICAS REAIS */}
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

        <Card className="shadow-sm">
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
                          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDeleteCase(caso.id)}><Trash2 className="w-4 h-4"/></Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;