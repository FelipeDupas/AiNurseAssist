import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, AlertCircle, CheckCircle, Activity, Stethoscope } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const CaseView = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  // Mock data - in production, fetch from backend
  const caseData = {
    patient: {
      name: "Maria Santos",
      age: 52,
      gender: "Feminino",
      history: "Hipertensão controlada, diabetes tipo 2"
    },
    symptoms: "Paciente apresenta dor torácica intermitente há 3 dias, com irradiação para o braço esquerdo. Refere falta de ar aos esforços e sudorese. Pressão arterial elevada nas últimas medições.",
    exams: "Glicemia: 180mg/dL, PA: 160/95 mmHg",
    aiAnalysis: {
      referral: "Cardiologista",
      urgency: "Alta",
      justification: "Baseado nos sintomas apresentados (dor torácica com irradiação, dispneia aos esforços, sudorese) e fatores de risco cardiovascular (idade > 50 anos, hipertensão, diabetes), há indicação de avaliação cardiológica urgente para investigação de síndrome coronariana aguda.",
      diagnoses: [
        { name: "Síndrome Coronariana Aguda", probability: "Alta" },
        { name: "Angina Instável", probability: "Moderada" },
        { name: "Hipertensão Não Controlada", probability: "Moderada" }
      ],
      exams: [
        "Eletrocardiograma (ECG)",
        "Troponina cardíaca",
        "Ecocardiograma",
        "Monitoramento de pressão arterial 24h (MAPA)"
      ],
      medications: [
        "AAS 100mg - 1x ao dia",
        "Atenolol 50mg - 1x ao dia (ajuste de dose)",
        "Omeprazol 20mg - 1x ao dia (se uso de AAS)"
      ]
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
          <Button className="gap-2">
            <Download className="w-4 h-4" />
            Exportar Relatório (PDF)
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Análise do Caso #{id}</h1>
          <p className="text-muted-foreground">
            Visualize os dados do paciente e as recomendações da IA
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Column - Case Summary */}
          <div className="space-y-6">
            <Card className="shadow-[var(--shadow-card)]">
              <CardHeader>
                <CardTitle>Resumo do Caso</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-1">Paciente</h3>
                  <p className="text-lg font-medium">{caseData.patient.name}</p>
                  <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                    <span>Idade: {caseData.patient.age} anos</span>
                    <span>Sexo: {caseData.patient.gender}</span>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-2">
                    Histórico Médico
                  </h3>
                  <p className="text-sm">{caseData.patient.history}</p>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-2">
                    Sintomas Reportados
                  </h3>
                  <p className="text-sm leading-relaxed">{caseData.symptoms}</p>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-2">
                    Exames Realizados
                  </h3>
                  <p className="text-sm">{caseData.exams}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - AI Response */}
          <div className="space-y-6">
            <Card className="shadow-[var(--shadow-elevated)] border-l-4 border-l-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  Análise da IA
                </CardTitle>
                <CardDescription>Recomendações baseadas em análise de dados clínicos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 rounded-lg bg-destructive/10 border-l-4 border-l-destructive">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold mb-1">Recomendação de Encaminhamento</h3>
                      <p className="text-lg font-bold text-destructive mb-2">
                        {caseData.aiAnalysis.referral}
                      </p>
                      <Badge variant="destructive">Urgência: {caseData.aiAnalysis.urgency}</Badge>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    Justificativa (XAI)
                  </h3>
                  <p className="text-sm leading-relaxed bg-muted/50 p-4 rounded-lg">
                    {caseData.aiAnalysis.justification}
                  </p>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-3">Possíveis Diagnósticos</h3>
                  <div className="space-y-2">
                    {caseData.aiAnalysis.diagnoses.map((diagnosis, index) => (
                      <div 
                        key={index} 
                        className="flex justify-between items-center p-3 rounded-lg bg-muted/30"
                      >
                        <span className="text-sm font-medium">{diagnosis.name}</span>
                        <Badge variant={
                          diagnosis.probability === "Alta" ? "destructive" : 
                          diagnosis.probability === "Moderada" ? "default" : "secondary"
                        }>
                          {diagnosis.probability}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-3">Exames Sugeridos</h3>
                  <ul className="space-y-2">
                    {caseData.aiAnalysis.exams.map((exam, index) => (
                      <li 
                        key={index} 
                        className="flex items-start gap-2 text-sm p-2 rounded bg-muted/20"
                      >
                        <CheckCircle className="w-4 h-4 text-secondary mt-0.5 flex-shrink-0" />
                        <span>{exam}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-3">Medicações Sugeridas</h3>
                  <ul className="space-y-2">
                    {caseData.aiAnalysis.medications.map((med, index) => (
                      <li 
                        key={index} 
                        className="flex items-start gap-2 text-sm p-2 rounded bg-muted/20"
                      >
                        <CheckCircle className="w-4 h-4 text-secondary mt-0.5 flex-shrink-0" />
                        <span>{med}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CaseView;
