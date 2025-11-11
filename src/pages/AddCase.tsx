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
  const [formData, setFormData] = useState({
    fullName: "",
    age: "",
    gender: "",
    medicalHistory: "",
    symptoms: "",
    exams: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mock submission - in production, send to AI backend
    toast.success("Caso enviado para análise da IA com sucesso!");
    
    // Navigate to case view with mock ID
    setTimeout(() => {
      navigate("/case/new");
    }, 1500);
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
            Preencha os dados do paciente para análise da IA
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="shadow-[var(--shadow-elevated)] mb-6">
            <CardHeader>
              <CardTitle>Dados do Paciente</CardTitle>
              <CardDescription>Informações básicas do paciente</CardDescription>
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
                  <Label htmlFor="age">Idade *</Label>
                  <Input
                    id="age"
                    type="number"
                    placeholder="Ex: 45"
                    value={formData.age}
                    onChange={(e) => setFormData({...formData, age: e.target.value})}
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
                <Label htmlFor="medicalHistory">Histórico Médico Resumido</Label>
                <Textarea
                  id="medicalHistory"
                  placeholder="Descreva condições pré-existentes, alergias, cirurgias anteriores..."
                  value={formData.medicalHistory}
                  onChange={(e) => setFormData({...formData, medicalHistory: e.target.value})}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-[var(--shadow-elevated)] mb-6">
            <CardHeader>
              <CardTitle>Sintomas e Observações</CardTitle>
              <CardDescription>Descreva os sintomas apresentados pelo paciente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Label htmlFor="symptoms">Sintomas Detalhados *</Label>
              <Textarea
                id="symptoms"
                placeholder="Descreva em linguagem natural os sintomas, queixas principais, duração, intensidade..."
                value={formData.symptoms}
                onChange={(e) => setFormData({...formData, symptoms: e.target.value})}
                rows={6}
                required
              />
            </CardContent>
          </Card>

          <Card className="shadow-[var(--shadow-elevated)] mb-8">
            <CardHeader>
              <CardTitle>Exames e Testes</CardTitle>
              <CardDescription>Resultados de exames já realizados (se houver)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Label htmlFor="exams">Resultados de Exames</Label>
              <Textarea
                id="exams"
                placeholder="Descreva exames realizados e seus resultados..."
                value={formData.exams}
                onChange={(e) => setFormData({...formData, exams: e.target.value})}
                rows={5}
              />
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
            <Button type="submit" size="lg" className="gap-2 font-semibold">
              <Send className="w-4 h-4" />
              Enviar para IA
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default AddCase;
