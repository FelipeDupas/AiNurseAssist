import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
// @ts-ignore
import html2pdf from "html2pdf.js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Download, AlertCircle, CheckCircle, Activity, Stethoscope, ClipboardList, Baby, AlertTriangle, PenLine } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Pencil } from "lucide-react";
import { toast } from "sonner";

const referralColors: Record<string, string> = {
  "Urgência": "bg-red-100 border-l-red-600 text-red-900",
  "Clínica Geral": "bg-blue-50 border-l-blue-500 text-blue-900",
  "Pediatra": "bg-purple-50 border-l-purple-500 text-purple-900",
  "Cardiologia": "bg-rose-50 border-l-rose-500 text-rose-900",
  "Ortopedia": "bg-orange-50 border-l-orange-500 text-orange-900",
  "Neurologia": "bg-indigo-50 border-l-indigo-500 text-indigo-900",
  "Ginecologia": "bg-pink-50 border-l-pink-500 text-pink-900",
  "Psiquiatria": "bg-teal-50 border-l-teal-500 text-teal-900",
  "Dermatologia": "bg-yellow-50 border-l-yellow-500 text-yellow-900",
  "Oncologia": "bg-gray-100 border-l-gray-600 text-gray-900",
};

const urgencyColors: Record<string, string> = {
  "Alta": "bg-red-100 text-red-800 border-red-300",
  "Média": "bg-yellow-100 text-yellow-800 border-yellow-300",
  "Baixa": "bg-green-100 text-green-800 border-green-300",
};

const careTypeConfig: Record<string, { label: string; color: string; icon: JSX.Element }> = {
  "Urgência": { label: "Urgência", color: "bg-red-100 text-red-700 border-red-300", icon: <AlertTriangle className="w-3 h-3" /> },
  "Pediátrico": { label: "Pediátrico", color: "bg-purple-100 text-purple-700 border-purple-300", icon: <Baby className="w-3 h-3" /> },
  "Clínica Geral": { label: "Clínica Geral", color: "bg-blue-100 text-blue-700 border-blue-300", icon: <Stethoscope className="w-3 h-3" /> },
};

interface ExtendedAnamnesis {
  antecedentes_pessoais?: string;
  antecedentes_familiares?: string;
  antecedentes_cirurgicos?: string;
  historia_gineco_obstetrica?: string;
  habitos_vida?: string;
  medicamentos_uso?: string;
  alergias?: string;
  revisao_sistemas?: string;
  pediatric_responsible?: string;
  pediatric_vaccines?: string;
  pediatric_breastfed?: string;
  pediatric_dnpm?: string;
}

interface CaseData {
  id: number;
  patient_name: string;
  birth_date: string;
  gender: string;
  cpf?: string;
  mother_name?: string;
  medical_history?: string;
  care_type?: string;
  anamnesis?: string;
  hpma?: string;
  extended_anamnesis_json?: ExtendedAnamnesis;
  symptoms: string;
  exams_input?: string;
  created_at: string;
  doctor_conclusion?: string;
  ai_analysis_json: {
    referral: string;
    urgency: string;
    justification: string;
    pathology_type?: string;
    cid10?: { code: string; description: string };
    cid10_secondary?: Array<{ code: string; description: string }>;
    diagnoses?: Array<{ name: string; probability: string }>;
    exams?: string[];
    medications?: string[];
  };
}

const hasValue = (v: string | null | undefined) => v != null && v.trim() !== "";

const CaseView = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [conclusionText, setConclusionText] = useState("");
  const [savingConclusion, setSavingConclusion] = useState(false);

  useEffect(() => {
    const fetchCaseDetail = async () => {
      try {
        const response = await fetch(`http://127.0.0.1:8000/cases/${id}`);
        if (response.ok) {
          const data = await response.json();
          setCaseData(data);
          setConclusionText(data.doctor_conclusion || "");
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

  const handleExportPDF = () => {
    const element = document.getElementById("report-content");
    const opt = {
      margin: [10, 10, 10, 10],
      filename: `Relatorio_Medico_${caseData?.patient_name.replace(/\s+/g, "_")}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    };
    html2pdf().set(opt).from(element).save();
  };

  const handleSaveConclusion = async () => {
    setSavingConclusion(true);
    try {
      const response = await fetch(`http://127.0.0.1:8000/cases/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctor_conclusion: conclusionText }),
      });
      if (response.ok) {
        toast.success("Conclusão salva com sucesso!");
        setCaseData((prev) => prev ? { ...prev, doctor_conclusion: conclusionText } : prev);
      } else {
        toast.error("Erro ao salvar conclusão.");
      }
    } catch {
      toast.error("Erro de conexão ao salvar conclusão.");
    } finally {
      setSavingConclusion(false);
    }
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
  const ext = caseData.extended_anamnesis_json;

  const calcularIdade = (dataNasc: string) => {
    if (!dataNasc) return "N/A";
    const nasc = new Date(dataNasc);
    const hoje = new Date();
    let idade = hoje.getFullYear() - nasc.getFullYear();
    const m = hoje.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
    return idade;
  };

  const referralClass = referralColors[ai?.referral] ?? "bg-blue-50 border-l-blue-500 text-blue-900";
  const urgencyClass = urgencyColors[ai?.urgency] ?? "bg-gray-100 text-gray-700 border-gray-300";
  const careConfig = careTypeConfig[caseData.care_type ?? "Clínica Geral"] ?? careTypeConfig["Clínica Geral"];

  const extSections = ext ? [
    { label: "Antecedentes Pessoais", value: ext.antecedentes_pessoais },
    { label: "Antecedentes Familiares", value: ext.antecedentes_familiares },
    { label: "Antecedentes Cirúrgicos", value: ext.antecedentes_cirurgicos },
    { label: "História Gineco-Obstétrica", value: ext.historia_gineco_obstetrica },
    { label: "Hábitos de Vida", value: ext.habitos_vida },
    { label: "Medicamentos em Uso", value: ext.medicamentos_uso },
    { label: "Alergias", value: ext.alergias },
    { label: "Revisão por Sistemas", value: ext.revisao_sistemas },
  ].filter(s => hasValue(s.value)) : [];

  const pediatricSections = ext ? [
    { label: "Responsável Legal", value: ext.pediatric_responsible },
    { label: "Situação Vacinal", value: ext.pediatric_vaccines },
    { label: "Aleitamento Materno", value: ext.pediatric_breastfed },
    { label: "DNPM", value: ext.pediatric_dnpm },
  ].filter(s => hasValue(s.value)) : [];

  const hasAnamnesis = hasValue(caseData.anamnesis) || hasValue(caseData.hpma) || extSections.length > 0;
  const hasPediatric = pediatricSections.length > 0;
  const hasDiagnoses = ai?.diagnoses && ai.diagnoses.length > 0;
  const hasExams = ai?.exams && ai.exams.length > 0;
  const hasMedications = ai?.medications && ai.medications.length > 0;
  const hasSecondaryCid = ai?.cid10_secondary && ai.cid10_secondary.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10 print:hidden">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <Button variant="ghost" onClick={() => navigate("/dashboard")} className="gap-2">
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
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="gap-2 border-primary text-primary hover:bg-primary/5"
              onClick={() => navigate(`/edit-case/${id}`)}
            >
              <Pencil className="w-4 h-4" />
              Editar Caso
            </Button>
            <Button className="gap-2" onClick={handleExportPDF}>
              <Download className="w-4 h-4" />
              Exportar PDF
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8" id="report-content">
        <div className="mb-8 print:mb-4">
          <div className="flex justify-between items-start flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Relatório de Teletriagem</h1>
              <p className="text-muted-foreground">
                Caso #{caseData.id} • Gerado em {caseData.created_at}
              </p>
            </div>
            <Badge className={`flex items-center gap-1 border text-sm px-3 py-1 ${careConfig.color}`}>
              {careConfig.icon}
              {careConfig.label}
            </Badge>
          </div>

          {hasValue(caseData.doctor_conclusion) && (
            <div className="mt-4 p-4 border border-green-300 bg-green-50 rounded-lg">
              <h3 className="font-semibold text-green-800 mb-1 text-sm uppercase tracking-wide">Conclusão do Médico</h3>
              <p className="text-sm text-green-900">{caseData.doctor_conclusion}</p>
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-2 gap-6 print:block print:space-y-6">

          <div className="space-y-6">

            <Card className="shadow-[var(--shadow-card)] print:shadow-none print:border">
              <CardHeader>
                <CardTitle>Dados do Paciente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-1">Nome</h3>
                  <p className="text-lg font-medium">{caseData.patient_name}</p>
                  <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                    <span>Idade: {calcularIdade(caseData.birth_date)} anos</span>
                    <span>Sexo: {caseData.gender}</span>
                  </div>
                </div>

                {(caseData.cpf || caseData.mother_name) && (
                  <>
                    <Separator />
                    <div className="grid grid-cols-2 gap-4">
                      {caseData.cpf && (
                        <div>
                          <h3 className="font-semibold text-xs text-muted-foreground mb-1 uppercase tracking-wide">CPF</h3>
                          <p className="text-sm font-mono">{caseData.cpf}</p>
                        </div>
                      )}
                      {caseData.mother_name && (
                        <div>
                          <h3 className="font-semibold text-xs text-muted-foreground mb-1 uppercase tracking-wide">Nome da Mãe</h3>
                          <p className="text-sm">{caseData.mother_name}</p>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {hasValue(caseData.medical_history) && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold text-sm text-muted-foreground mb-2">Histórico Médico Base</h3>
                      <p className="text-sm">{caseData.medical_history}</p>
                    </div>
                  </>
                )}

                <Separator />
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-2">Sintomas</h3>
                  <p className="text-sm leading-relaxed">{caseData.symptoms}</p>
                </div>

                {hasValue(caseData.exams_input) && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold text-sm text-muted-foreground mb-2">Exames Prévios</h3>
                      <p className="text-sm">{caseData.exams_input}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {hasPediatric && (
              <Card className="shadow-[var(--shadow-card)] border-l-4 border-l-purple-400 print:shadow-none print:border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Baby className="w-5 h-5 text-purple-500" />
                    Dados Pediátricos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {pediatricSections.map((s, i) => (
                    <div key={i}>
                      {i > 0 && <Separator className="mb-3" />}
                      <h3 className="font-semibold text-xs text-muted-foreground mb-1 uppercase tracking-wide">{s.label}</h3>
                      <p className="text-sm">{s.value}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {hasAnamnesis && (
              <Card className="shadow-[var(--shadow-card)] border-l-4 border-l-blue-400 print:shadow-none print:border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-blue-500" />
                    Anamnese
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {hasValue(caseData.anamnesis) && (
                    <div>
                      <h3 className="font-semibold text-sm text-muted-foreground mb-2">Anamnese Geral</h3>
                      <p className="text-sm leading-relaxed bg-muted/30 p-3 rounded-lg">{caseData.anamnesis}</p>
                    </div>
                  )}

                  {hasValue(caseData.hpma) && (
                    <>
                      {hasValue(caseData.anamnesis) && <Separator />}
                      <div>
                        <h3 className="font-semibold text-sm text-muted-foreground mb-2">HPMA — História da Presente Moléstia Atual</h3>
                        <p className="text-sm leading-relaxed bg-muted/30 p-3 rounded-lg">{caseData.hpma}</p>
                      </div>
                    </>
                  )}

                  {extSections.map((s, i) => (
                    <div key={i}>
                      <Separator />
                      <div className="pt-2">
                        <h3 className="font-semibold text-sm text-muted-foreground mb-2">{s.label}</h3>
                        <p className="text-sm leading-relaxed bg-muted/30 p-3 rounded-lg">{s.value}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card className="shadow-[var(--shadow-card)] border-l-4 border-l-green-400 print:hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PenLine className="w-5 h-5 text-green-600" />
                  Conclusão do Médico
                </CardTitle>
                <CardDescription>Registre sua conclusão clínica sobre este caso</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  placeholder="Digite sua conclusão clínica, observações finais ou conduta definida..."
                  value={conclusionText}
                  onChange={(e) => setConclusionText(e.target.value)}
                  rows={4}
                />
                <Button
                  onClick={handleSaveConclusion}
                  disabled={savingConclusion}
                  className="gap-2"
                  variant="outline"
                >
                  <PenLine className="w-4 h-4" />
                  {savingConclusion ? "Salvando..." : "Salvar Conclusão"}
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {ai ? (
              <Card className="shadow-[var(--shadow-elevated)] border-l-4 border-l-primary print:shadow-none print:border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    Análise Inteligente
                  </CardTitle>
                  <CardDescription>Suporte à Decisão Clínica — AI Nurse Assist</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">

                  <div className={`p-4 rounded-lg border-l-4 ${referralClass}`}>
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">Encaminhamento Sugerido</h3>
                        <p className="text-xl font-bold mb-3">{ai.referral}</p>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className={`bg-white/80 border font-medium ${urgencyClass}`}>
                            Urgência: {ai.urgency}
                          </Badge>
                          {hasValue(ai.pathology_type) && (
                            <Badge variant="outline" className="bg-white/80">
                              {ai.pathology_type}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {ai.cid10 && (
                    <div>
                      <h3 className="font-semibold mb-2 text-sm text-muted-foreground uppercase tracking-wide">Classificação CID-10</h3>
                      <div className="flex items-center gap-4 p-3 bg-muted/40 rounded-lg border">
                        <div className="text-center min-w-[64px]">
                          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Principal</p>
                          <span className="text-lg font-mono font-bold text-primary">{ai.cid10.code}</span>
                        </div>
                        <Separator orientation="vertical" className="h-10" />
                        <p className="text-sm">{ai.cid10.description}</p>
                      </div>

                      {hasSecondaryCid && (
                        <div className="mt-2 space-y-2">
                          {ai.cid10_secondary!.map((cid, i) => (
                            <div key={i} className="flex items-center gap-4 p-3 bg-muted/20 rounded-lg border border-dashed">
                              <div className="text-center min-w-[64px]">
                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Secundário</p>
                                <span className="text-sm font-mono font-semibold text-muted-foreground">{cid.code}</span>
                              </div>
                              <Separator orientation="vertical" className="h-8" />
                              <p className="text-sm text-muted-foreground">{cid.description}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-primary" />
                      Justificativa Clínica
                    </h3>
                    <p className="text-sm leading-relaxed bg-muted/50 p-4 rounded-lg print:bg-gray-50">
                      {ai.justification}
                    </p>
                  </div>

                  {hasDiagnoses && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="font-semibold mb-3">Hipóteses Diagnósticas</h3>
                        <div className="space-y-2">
                          {ai.diagnoses!.map((diagnosis, index) => (
                            <div
                              key={index}
                              className="flex justify-between items-center p-3 rounded-lg bg-muted/30 print:bg-gray-50 print:border"
                            >
                              <span className="text-sm font-medium">{diagnosis.name}</span>
                              <span className="text-xs font-bold px-2 py-1 rounded bg-white border shrink-0 ml-2">
                                {diagnosis.probability}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {hasExams && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="font-semibold mb-3">Exames Sugeridos</h3>
                        <ul className="space-y-2">
                          {ai.exams!.map((exam, index) => (
                            <li key={`ex-${index}`} className="flex items-start gap-2 text-sm">
                              <span className="font-bold text-primary mt-0.5">•</span>
                              <span>{exam}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </>
                  )}

                  {hasMedications && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="font-semibold mb-3">Medicações Sugeridas</h3>
                        <ul className="space-y-2">
                          {ai.medications!.map((med, index) => (
                            <li key={`med-${index}`} className="flex items-start gap-2 text-sm">
                              <span className="font-bold text-secondary mt-0.5">•</span>
                              <span>{med}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </>
                  )}

                </CardContent>
              </Card>
            ) : (
              <div className="p-4 bg-red-100 text-red-700 rounded-lg">
                Análise pendente ou erro na IA.
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 text-center text-xs text-muted-foreground hidden print:block">
          Relatório gerado automaticamente por AI Nurse Assist • Uso exclusivo para suporte à decisão clínica.
        </div>
      </main>
    </div>
  );
};

export default CaseView;
