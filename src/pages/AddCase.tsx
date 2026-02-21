import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Send, Stethoscope } from "lucide-react";
import { toast } from "sonner";

const AddCase = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  // Recupera as informações do médico logado do localStorage
  const medicoString = localStorage.getItem("medico");
  const medico = medicoString ? JSON.parse(medicoString) : null;

  const [formData, setFormData] = useState({
    fullName: "",
    birthDate: "",
    gender: "",
    medicalHistory: "",
    symptoms: "",
    exams: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Verificação de segurança: garante que o usuário está logado
    if (!medico || !medico.id) {
      toast.error("Erro de sessão. Faça login novamente.");
      navigate("/login");
      return;
    }

    setLoading(true);

    try {
      // Ajuste crucial: Enviamos os dados no formato que o novo Back-end espera (separado)
      const response = await fetch(`http://127.0.0.1:8000/cases/?owner_id=${medico.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patient_data: {
            full_name: formData.fullName,       // O Backend espera full_name
            birth_date: formData.birthDate,     // O Backend espera birth_date
            gender: formData.gender,
            medical_history: formData.medicalHistory // O Backend espera medical_history
          },
          symptoms: formData.symptoms,
          exams: formData.exams
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success("Paciente cadastrado e caso analisado pela IA!");
        
        // Redireciona para a visualização do caso usando o ID retornado
        navigate(`/case/${data.id}`); 
      } else {
        const error = await response.json();
        toast.error("Erro ao enviar: " + (error.detail || "Erro desconhecido"));
      }
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro de conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  };

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

      <main className="container mx-auto px-6 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Adicionar Caso Clínico</h1>
          <p className="text-muted-foreground">
            Preencha os dados do paciente. Ele será cadastrado automaticamente no sistema.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* SEÇÃO 1: DADOS FIXOS DO PACIENTE */}
          <Card className="shadow-[var(--shadow-elevated)] mb-6">
            <CardHeader>
              <CardTitle>Dados do Paciente</CardTitle>
              <CardDescription>Informações para o prontuário permanente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nome Completo *</Label>
                  <Input
                    id="fullName"
                    placeholder="Nome do paciente"
                    value={formData.fullName}
                    onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birthDate">Data de Nascimento *</Label>
                  <Input
                    id="birthDate"
                    type="date"  
                    value={formData.birthDate}
                    onChange={(e) => setFormData({...formData, birthDate: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="gender">Sexo *</Label>
                  <Select 
                    value={formData.gender} 
                    onValueChange={(value) => setFormData({...formData, gender: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="masculino">Masculino</SelectItem>
                      <SelectItem value="feminino">Feminino</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="medicalHistory">Histórico Médico Base</Label>
                <Textarea
                  id="medicalHistory"
                  placeholder="Doenças crônicas, alergias e cirurgias que ficarão salvas no prontuário..."
                  value={formData.medicalHistory}
                  onChange={(e) => setFormData({...formData, medicalHistory: e.target.value})}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* SEÇÃO 2: DADOS DA CONSULTA ATUAL */}
          <Card className="shadow-[var(--shadow-elevated)] mb-6 border-l-4 border-l-primary">
            <CardHeader>
              <CardTitle>Sintomas da Consulta</CardTitle>
              <CardDescription>O que o paciente apresenta no momento</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="symptoms">Sintomas Detalhados *</Label>
                <Textarea
                  id="symptoms"
                  placeholder="Descreva as queixas atuais para análise da IA..."
                  value={formData.symptoms}
                  onChange={(e) => setFormData({...formData, symptoms: e.target.value})}
                  rows={6}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="exams">Exames Atuais (opcional)</Label>
                <Textarea
                  id="exams"
                  placeholder="Resultados de exames realizados hoje..."
                  value={formData.exams}
                  onChange={(e) => setFormData({...formData, exams: e.target.value})}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4 justify-end">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => navigate("/dashboard")}
            >
              Cancelar
            </Button>
            <Button type="submit" size="lg" className="gap-2 font-semibold" disabled={loading}>
              <Send className="w-4 h-4" />
              {loading ? "Processando..." : "Analisar e Cadastrar"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default AddCase;