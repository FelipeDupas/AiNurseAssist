import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
// @ts-ignore
import html2pdf from "html2pdf.js"; // Importa a lib de PDF
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, AlertCircle, CheckCircle, Activity, Stethoscope } from "lucide-react";
import { Separator } from "@/components/ui/separator";

// Interface para garantir que o TypeScript entenda os dados do Python
interface CaseData {
  id: number;
  patient_name: string;
  age: number;
  gender: string;
  medical_history: string;
  symptoms: string;
  exams_input: string;
  created_at: string;
  ai_analysis_json: {
    referral: string;
    urgency: string;
    justification: string;
    diagnoses: Array<{ name: string; probability: string }>;
    exams: string[];
    medications: string[];
  };
}

const CaseView = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [loading, setLoading] = useState(true);

  // Busca os dados reais do Backend
  useEffect(() => {
    const fetchCaseDetail = async () => {
      try {
        const response = await fetch(`http://127.0.0.1:8000/cases/${id}`);
        if (response.ok) {
          const data = await response.json();
          setCaseData(data);
        } else {
          alert("Caso não encontrado");
          navigate("/dashboard");
        }
      } catch (error) {
        console.error("Erro ao carregar caso:", error);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchCaseDetail();
  }, [id, navigate]);

  // Função para Gerar o PDF
  const handleExportPDF = () => {
    const element = document.getElementById("report-content"); // Pega o conteúdo da div principal
    const opt = {
      margin: [10, 10, 10, 10], // Margens (Topo, Esq, Baixo, Dir)
      filename: `Relatorio_Medico_${caseData?.patient_name.replace(/\s+/g, '_')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // Gera o PDF
    html2pdf().set(opt).from(element).save();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Activity className="w-10 h-10 text-primary animate-pulse" />
          <p className="text-lg font-medium text-muted-foreground">Carregando dados do caso...</p>
        </div>
      </div>
    );
  }

  if (!caseData) return null;

  const ai = caseData.ai_analysis_json;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10 print:hidden">
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
          <Button className="gap-2" onClick={handleExportPDF}>
            <Download className="w-4 h-4" />
            Exportar Relatório (PDF)
          </Button>
        </div>
      </header>

      {/* ID 'report-content' é o que vai sair no PDF */}
      <main className="container mx-auto px-6 py-8" id="report-content">
        <div className="mb-8 print:mb-4">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-2">Relatório de Teletriagem</h1>
              <p className="text-muted-foreground">
                Caso #{caseData.id} • Gerado em {caseData.created_at}
              </p>
            </div>
            {/* Logo visível apenas no PDF se quiser, ou deixa padrão */}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 print:block print:space-y-6">
          {/* Coluna Esquerda: Dados do Paciente */}
          <div className="space-y-6">
            <Card className="shadow-[var(--shadow-card)] print:shadow-none print:border">
              <CardHeader>
                <CardTitle>Resumo Clínico</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-1">Paciente</h3>
                  <p className="text-lg font-medium">{caseData.patient_name}</p>
                  <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                    <span>Idade: {caseData.age} anos</span>
                    <span>Sexo: {caseData.gender}</span>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-2">Histórico Médico</h3>
                  <p className="text-sm">{caseData.medical_history || "Não informado"}</p>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-2">Sintomas</h3>
                  <p className="text-sm leading-relaxed">{caseData.symptoms}</p>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-2">Exames Prévios</h3>
                  <p className="text-sm">{caseData.exams_input || "Nenhum informado"}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Coluna Direita: IA */}
          <div className="space-y-6">
            {ai ? (
              <Card className="shadow-[var(--shadow-elevated)] border-l-4 border-l-primary print:shadow-none print:border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    Análise Inteligente
                  </CardTitle>
                  <CardDescription>Suporte à Decisão Clínica</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Encaminhamento */}
                  <div className={`p-4 rounded-lg border-l-4 ${
                    ai.urgency === "Alta" ? "bg-destructive/10 border-l-destructive" : 
                    ai.urgency === "Média" ? "bg-yellow-100 border-l-yellow-500" : 
                    "bg-green-100 border-l-green-500"
                  }`}>
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold mb-1">Encaminhamento Sugerido</h3>
                        <p className="text-lg font-bold mb-2">{ai.referral}</p>
                        <Badge variant="outline" className="bg-white">Urgência: {ai.urgency}</Badge>
                      </div>
                    </div>
                  </div>

                  {/* Justificativa */}
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-primary" />
                      Justificativa
                    </h3>
                    <p className="text-sm leading-relaxed bg-muted/50 p-4 rounded-lg print:bg-gray-50">
                      {ai.justification}
                    </p>
                  </div>

                  <Separator />

                  {/* Diagnósticos */}
                  <div>
                    <h3 className="font-semibold mb-3">Hipóteses Diagnósticas</h3>
                    <div className="space-y-2">
                      {ai.diagnoses?.map((diagnosis, index) => (
                        <div key={index} className="flex justify-between items-center p-3 rounded-lg bg-muted/30 print:bg-gray-50 print:border">
                          <span className="text-sm font-medium">{diagnosis.name}</span>
                          <span className="text-xs font-bold px-2 py-1 rounded bg-white border">
                            {diagnosis.probability}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Conduta */}
                  <div>
                    <h3 className="font-semibold mb-3">Sugestão de Conduta</h3>
                    <ul className="space-y-2">
                      {ai.exams?.map((exam, index) => (
                        <li key={`ex-${index}`} className="flex items-start gap-2 text-sm">
                          <span className="font-bold text-primary">•</span>
                          <span>Exame: {exam}</span>
                        </li>
                      ))}
                      {ai.medications?.map((med, index) => (
                        <li key={`med-${index}`} className="flex items-start gap-2 text-sm">
                          <span className="font-bold text-secondary">•</span>
                          <span>Medicação: {med}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="p-4 bg-red-100 text-red-700 rounded-lg">
                Análise pendente ou erro na IA.
              </div>
            )}
          </div>
        </div>

        {/* Rodapé do PDF */}
        <div className="mt-8 text-center text-xs text-muted-foreground hidden print:block">
          Relatório gerado automaticamente por AI Nurse Assist • Uso exclusivo para suporte à decisão clínica.
        </div>
      </main>
    </div>
  );
};

export default CaseView;