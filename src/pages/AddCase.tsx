import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Send, Stethoscope, User, ClipboardList, FileText } from "lucide-react";
import { toast } from "sonner";

const AddCase = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  const medicoString = localStorage.getItem("medico");
  const medico = medicoString ? JSON.parse(medicoString) : null;

  const [formData, setFormData] = useState({
    fullName: "",
    birthDate: "",
    gender: "",
    cpf: "",
    motherName: "",
    medicalHistory: "",
    anamnesis: "",
    hpma: "",
    symptoms: "",
    exams: ""
  });

  // Formata CPF enquanto digita: 000.000.000-00
  const formatCPF = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!medico || !medico.id) {
      toast.error("Erro de sessão. Faça login novamente.");
      navigate("/login");
      return;
    }

    if (!formData.gender) {
      toast.error("Por favor, selecione o sexo do paciente.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`http://127.0.0.1:8000/cases/?owner_id=${medico.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patient_data: {
            full_name: formData.fullName,
            birth_date: formData.birthDate,
            gender: formData.gender,
            cpf: formData.cpf || null,
            mother_name: formData.motherName || null,
            medical_history: formData.medicalHistory
          },
          anamnesis: formData.anamnesis,
          hpma: formData.hpma,
          symptoms: formData.symptoms,
          exams: formData.exams
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success("Caso analisado pela IA com sucesso!");
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
            Preencha os dados do paciente e a anamnese para que a IA realize a análise clínica.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* SEÇÃO 1: DADOS DO PACIENTE */}
          <Card className="shadow-[var(--shadow-elevated)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Dados do Paciente
              </CardTitle>
              <CardDescription>
                Informações obrigatórias para o prontuário. CPF e Nome da Mãe são essenciais para conformidade legal.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Nome + Data de Nascimento */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nome Completo *</Label>
                  <Input
                    id="fullName"
                    placeholder="Nome completo do paciente"
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

              {/* Sexo + CPF */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="gender">Sexo *</Label>
                  <Select 
                    value={formData.gender} 
                    onValueChange={(value) => setFormData({...formData, gender: value})}
                  >
                    <SelectTrigger id="gender">
                      <SelectValue placeholder="Selecione o sexo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="masculino">Masculino</SelectItem>
                      <SelectItem value="feminino">Feminino</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cpf">
                    CPF <span className="text-xs text-primary font-semibold">(crítico para registros)</span>
                  </Label>
                  <Input
                    id="cpf"
                    placeholder="000.000.000-00"
                    value={formData.cpf}
                    onChange={(e) => setFormData({...formData, cpf: formatCPF(e.target.value)})}
                    maxLength={14}
                  />
                </div>
              </div>

              {/* Nome da Mãe */}
              <div className="space-y-2">
                <Label htmlFor="motherName">
                  Nome da Mãe <span className="text-xs text-primary font-semibold">(crítico para registros)</span>
                </Label>
                <Input
                  id="motherName"
                  placeholder="Nome completo da mãe do paciente"
                  value={formData.motherName}
                  onChange={(e) => setFormData({...formData, motherName: e.target.value})}
                />
              </div>

              {/* Histórico Médico Base */}
              <div className="space-y-2">
                <Label htmlFor="medicalHistory">Histórico Médico Base</Label>
                <Textarea
                  id="medicalHistory"
                  placeholder="Doenças crônicas, alergias, cirurgias anteriores, medicações contínuas..."
                  value={formData.medicalHistory}
                  onChange={(e) => setFormData({...formData, medicalHistory: e.target.value})}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* SEÇÃO 2: ANAMNESE MÉDICA */}
          <Card className="shadow-[var(--shadow-elevated)] border-l-4 border-l-blue-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-blue-500" />
                Anamnese Médica
              </CardTitle>
              <CardDescription>
                Coleta sistemática de informações sobre o histórico de saúde do paciente nesta consulta
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Anamnese Geral */}
              <div className="space-y-2">
                <Label htmlFor="anamnesis">Anamnese Geral</Label>
                <Textarea
                  id="anamnesis"
                  placeholder="Descreva a queixa principal, hábitos de vida (tabagismo, etilismo, sedentarismo), histórico familiar, vacinas, antecedentes pessoais relevantes..."
                  value={formData.anamnesis}
                  onChange={(e) => setFormData({...formData, anamnesis: e.target.value})}
                  rows={5}
                />
              </div>

              {/* HPMA */}
              <div className="space-y-2">
                <Label htmlFor="hpma">
                  HPMA — História da Presente Moléstia Atual
                </Label>
                <Textarea
                  id="hpma"
                  placeholder="Descreva de forma detalhada e cronológica: quando iniciou, como iniciou, fatores de melhora/piora, irradiação da dor, sintomas associados, tratamentos já realizados para esta queixa, evolução do quadro..."
                  value={formData.hpma}
                  onChange={(e) => setFormData({...formData, hpma: e.target.value})}
                  rows={6}
                />
              </div>
            </CardContent>
          </Card>

          {/* SEÇÃO 3: CONSULTA ATUAL */}
          <Card className="shadow-[var(--shadow-elevated)] border-l-4 border-l-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Dados da Consulta Atual
              </CardTitle>
              <CardDescription>Sintomas e exames para análise da IA</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="symptoms">Sintomas Detalhados *</Label>
                <Textarea
                  id="symptoms"
                  placeholder="Liste os sintomas atuais do paciente para a análise de IA: dor, febre, dispneia, tontura, etc..."
                  value={formData.symptoms}
                  onChange={(e) => setFormData({...formData, symptoms: e.target.value})}
                  rows={5}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="exams">Exames Realizados (opcional)</Label>
                <Textarea
                  id="exams"
                  placeholder="Resultados de exames laboratoriais, de imagem ou outros realizados anteriormente ou nesta consulta..."
                  value={formData.exams}
                  onChange={(e) => setFormData({...formData, exams: e.target.value})}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4 justify-end pb-8">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => navigate("/dashboard")}
            >
              Cancelar
            </Button>
            <Button type="submit" size="lg" className="gap-2 font-semibold" disabled={loading}>
              <Send className="w-4 h-4" />
              {loading ? "Analisando com IA..." : "Analisar e Cadastrar"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default AddCase;