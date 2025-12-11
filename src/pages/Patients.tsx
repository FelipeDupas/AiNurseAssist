import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Search, Download, Eye, Stethoscope } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Interface para tipar os dados do Backend
interface Case {
  id: number;
  patient_name: string;
  created_at: string;
  status: string;
  ai_analysis_json?: {
    urgency?: string;
  };
}

const Patients = () => {
  const navigate = useNavigate();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  // Pega o usuário logado
  const medicoString = localStorage.getItem("medico");
  const medico = medicoString ? JSON.parse(medicoString) : null;

  // Busca os dados reais ao abrir a tela
  useEffect(() => {
    if (!medico?.id) {
      navigate("/login");
      return;
    }

    const fetchCases = async () => {
      try {
        const response = await fetch(`http://127.0.0.1:8000/cases/?owner_id=${medico.id}`);
        if (response.ok) {
          const data = await response.json();
          // Ordena por ID decrescente (mais recentes primeiro)
          setCases(data.sort((a: any, b: any) => b.id - a.id));
        }
      } catch (error) {
        console.error("Erro ao buscar pacientes:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCases();
  }, [medico?.id, navigate]);

  // Lógica de filtragem
  const filteredPatients = cases.filter(patient => {
    const matchesSearch = patient.patient_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Filtro de Status
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "analisado" && patient.status === "Analisado") ||
      (statusFilter === "pendente" && patient.status === "Pendente");

    // Filtro de Data (Simplificado)
    let matchesDate = true;
    const caseDate = new Date(patient.created_at); // Assume formato YYYY-MM-DD
    const today = new Date();
    
    if (dateFilter === "today") {
      matchesDate = caseDate.toDateString() === today.toDateString();
    } else if (dateFilter === "week") {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(today.getDate() - 7);
      matchesDate = caseDate >= oneWeekAgo;
    } else if (dateFilter === "month") {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(today.getMonth() - 1);
      matchesDate = caseDate >= oneMonthAgo;
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/dashboard")}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Dashboard
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Stethoscope className="w-4 h-4 text-primary-foreground" />
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
          <p className="text-muted-foreground">
            Visualize e gerencie todos os casos de pacientes
          </p>
        </div>

        {/* Filtros */}
        <Card className="shadow-[var(--shadow-elevated)] mb-6">
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
            <CardDescription>Filtre os pacientes por nome, data ou status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome do paciente"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por data" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as datas</SelectItem>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="week">Última semana</SelectItem>
                  <SelectItem value="month">Último mês</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="analisado">Analisado</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Resultados */}
        <Card className="shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle>Lista de Pacientes</CardTitle>
            <CardDescription>
              {filteredPatients.length} paciente(s) encontrado(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-semibold">Paciente</th>
                    <th className="pb-3 font-semibold">Data</th>
                    <th className="pb-3 font-semibold">Status do Caso</th>
                    <th className="pb-3 font-semibold">Urgência</th>
                    <th className="pb-3 font-semibold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} className="text-center py-4">Carregando...</td></tr>
                  ) : filteredPatients.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-4 text-muted-foreground">Nenhum paciente encontrado.</td></tr>
                  ) : (
                    filteredPatients.map((patient) => {
                      // Extrai a urgência do JSON da IA (se existir)
                      const urgency = patient.ai_analysis_json?.urgency || "Indefinida";
                      
                      return (
                        <tr key={patient.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                          <td className="py-4 font-medium">{patient.patient_name}</td>
                          <td className="py-4 text-muted-foreground">
                            {patient.created_at} 
                          </td>
                          <td className="py-4">
                            <Badge variant={patient.status === "Analisado" ? "default" : "secondary"}>
                              {patient.status}
                            </Badge>
                          </td>
                          <td className="py-4">
                            <Badge variant={
                              urgency === "Alta" ? "destructive" :
                              urgency === "Média" ? "default" : "secondary"
                            }>
                              {urgency}
                            </Badge>
                          </td>
                          <td className="py-4">
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/case/${patient.id}`)}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                Ver
                              </Button>
                              {/* Botão Exportar (Placeholder - teria que implementar a lógica igual do CaseView) */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/case/${patient.id}`)} // Manda pro view pra exportar de lá
                              >
                                <Download className="w-4 h-4 mr-1" />
                                Abrir
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
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Patients;