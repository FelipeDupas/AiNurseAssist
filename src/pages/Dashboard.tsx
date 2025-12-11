import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, FileText, TrendingUp, User, LogOut, Settings } from "lucide-react";
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
  // Estado para guardar os casos reais do banco
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const medicoString = localStorage.getItem("medico");
  const medico = medicoString ? JSON.parse(medicoString) : {};

  // Efeito que carrega os dados assim que a tela abre
  useEffect(() => {
    if (!medico.id) {
      navigate("/login");
      return;
    }

    const fetchCases = async () => {
      try {
        const response = await fetch(`http://127.0.0.1:8000/cases/?owner_id=${medico.id}`);
        if (response.ok) {
          const data = await response.json();
          // Ordena do mais recente para o mais antigo
          const sortedData = data.sort((a: any, b: any) => b.id - a.id);
          setCases(sortedData);
        }
      } catch (error) {
        console.error("Erro ao buscar casos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCases();
  }, [medico.id, navigate]);

  const handleLogout = () => {
    localStorage.removeItem("medico");
    navigate("/login");
  };

  // Cálculos Reais baseados no Banco de Dados
  const totalPacientes = cases.length;
  const analisesConcluidas = cases.filter((c: any) => c.status === "Analisado").length;
  const casosPendentes = cases.filter((c: any) => c.status === "Pendente").length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              AI Nurse Assist
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <p className="font-semibold text-foreground">{medico.nome}</p>
              <p className="text-sm text-muted-foreground">CRM: {medico.crm}</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity">
                  <User className="w-5 h-5 text-primary-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-card z-50">
                <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/patients")} className="cursor-pointer">
                  <User className="w-4 h-4 mr-2" />
                  Pacientes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/settings")} className="cursor-pointer">
                  <Settings className="w-4 h-4 mr-2" />
                  Configurações
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Bem-vindo, {medico.nome}</h2>
          <p className="text-muted-foreground">
            Gerencie seus pacientes e casos clínicos com suporte de IA
          </p>
        </div>

        {/* CARDS COM DADOS REAIS */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-[var(--shadow-card)] border-l-4 border-l-primary">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Total de Casos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{totalPacientes}</p>
            </CardContent>
          </Card>

          <Card className="shadow-[var(--shadow-card)] border-l-4 border-l-secondary">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-secondary" />
                Análises Concluídas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{analisesConcluidas}</p>
            </CardContent>
          </Card>

          <Card className="shadow-[var(--shadow-card)] border-l-4 border-l-accent">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-5 h-5 text-accent" />
                Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{casosPendentes}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-[var(--shadow-elevated)] mb-8 bg-gradient-to-br from-primary/10 to-secondary/10 border-none">
          <CardHeader>
            <CardTitle>Adicionar Novo Caso Clínico</CardTitle>
            <CardDescription>
              Submeta um novo caso para análise da IA e recomendações de encaminhamento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              size="lg" 
              className="w-full md:w-auto font-semibold"
              onClick={() => navigate("/add-case")}
            >
              <Plus className="w-5 h-5 mr-2" />
              Adicionar Caso Clínico
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle>Casos Recentes</CardTitle>
            <CardDescription>Últimos casos submetidos para análise</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-semibold">Paciente</th>
                    <th className="pb-3 font-semibold">Data</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={4} className="text-center py-4">Carregando casos...</td></tr>
                  ) : cases.length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-4 text-muted-foreground">Nenhum caso cadastrado ainda.</td></tr>
                  ) : (
                    cases.map((caso: any) => (
                      <tr key={caso.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                        <td className="py-4 font-medium">{caso.patient_name}</td>
                        <td className="py-4 text-muted-foreground">
                          {caso.created_at}
                        </td>
                        <td className="py-4">
                          <Badge variant={caso.status === "Analisado" ? "default" : "secondary"}>
                            {caso.status}
                          </Badge>
                        </td>
                        <td className="py-4">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => navigate(`/case/${caso.id}`)}
                          >
                            Visualizar
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
      </main>
    </div>
  );
};

export default Dashboard; 