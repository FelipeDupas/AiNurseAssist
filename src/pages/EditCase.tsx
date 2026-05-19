import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { API_URL } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Loader2, ClipboardList, FileText, Stethoscope, PenLine } from "lucide-react";
import { toast } from "sonner";

interface CaseDetail {
  id: number;
  patient_name: string;
  care_type?: string;
  gender?: string;
  anamnesis?: string;
  hpma?: string;
  extended_anamnesis_json?: {
    antecedentes_pessoais?: string;
    antecedentes_familiares?: string;
    antecedentes_cirurgicos?: string;
    historia_gineco_obstetrica?: string;
    habitos_vida?: string;
    medicamentos_uso?: string;
    alergias?: string;
    revisao_sistemas?: string;
  };
  symptoms?: string;
  exams_input?: string;
  doctor_conclusion?: string;
}

interface FormState {
  hpma: string;
  anamnesis: string;
  antecedentes_pessoais: string;
  antecedentes_familiares: string;
  antecedentes_cirurgicos: string;
  historia_gineco_obstetrica: string;
  habitos_vida: string;
  medicamentos_uso: string;
  alergias: string;
  revisao_sistemas: string;
  symptoms: string;
  exams: string;
  doctor_conclusion: string;
}

const careTypeBadge: Record<string, string> = {
  "Urgência": "bg-red-100 text-red-700 border-red-300",
  "Pediátrico": "bg-purple-100 text-purple-700 border-purple-300",
  "Clínica Geral": "bg-blue-100 text-blue-700 border-blue-300",
};

const EditCase = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [caseDetail, setCaseDetail] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<FormState>({
    hpma: "",
    anamnesis: "",
    antecedentes_pessoais: "",
    antecedentes_familiares: "",
    antecedentes_cirurgicos: "",
    historia_gineco_obstetrica: "",
    habitos_vida: "",
    medicamentos_uso: "",
    alergias: "",
    revisao_sistemas: "",
    symptoms: "",
    exams: "",
    doctor_conclusion: "",
  });

  const medicoString = localStorage.getItem("medico");
  const medico = medicoString ? JSON.parse(medicoString) : {};

  useEffect(() => {
    const fetchCase = async () => {
      try {
        const response = await fetch(`${API_URL}/cases/${id}`);
        if (!response.ok) {
          toast.error("Caso não encontrado.");
          navigate("/dashboard");
          return;
        }
        const data: CaseDetail = await response.json();
        setCaseDetail(data);
        const ext = data.extended_anamnesis_json ?? {};
        setFormData({
          hpma: data.hpma ?? "",
          anamnesis: data.anamnesis ?? "",
          antecedentes_pessoais: ext.antecedentes_pessoais ?? "",
          antecedentes_familiares: ext.antecedentes_familiares ?? "",
          antecedentes_cirurgicos: ext.antecedentes_cirurgicos ?? "",
          historia_gineco_obstetrica: ext.historia_gineco_obstetrica ?? "",
          habitos_vida: ext.habitos_vida ?? "",
          medicamentos_uso: ext.medicamentos_uso ?? "",
          alergias: ext.alergias ?? "",
          revisao_sistemas: ext.revisao_sistemas ?? "",
          symptoms: data.symptoms ?? "",
          exams: data.exams_input ?? "",
          doctor_conclusion: data.doctor_conclusion ?? "",
        });
      } catch {
        toast.error("Erro de conexão ao carregar o caso.");
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchCase();
  }, [id, navigate]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload: Record<string, string | null> = {
      hpma: formData.hpma || null,
      anamnesis: formData.anamnesis || null,
      antecedentes_pessoais: formData.antecedentes_pessoais || null,
      antecedentes_familiares: formData.antecedentes_familiares || null,
      antecedentes_cirurgicos: formData.antecedentes_cirurgicos || null,
      habitos_vida: formData.habitos_vida || null,
      medicamentos_uso: formData.medicamentos_uso || null,
      alergias: formData.alergias || null,
      revisao_sistemas: formData.revisao_sistemas || null,
      symptoms: formData.symptoms || null,
      exams: formData.exams || null,
      doctor_conclusion: formData.doctor_conclusion || null,
    };

    if (caseDetail?.gender === "feminino") {
      payload.historia_gineco_obstetrica = formData.historia_gineco_obstetrica || null;
    }

    try {
      const response = await fetch(`${API_URL}/cases/${id}?owner_id=${medico.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success("Caso atualizado com sucesso!");
        navigate(`/case/${id}`);
      } else {
        const error = await response.json();
        toast.error("Erro ao salvar: " + (error.detail || "Erro desconhecido"));
      }
    } catch {
      toast.error("Erro de conexão ao salvar o caso.");
    } finally {
      setSaving(false);
    }
  };

  const update = (field: keyof FormState) => (e: React.ChangeEvent<HTMLTextAreaElement>) =>
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando caso...</p>
        </div>
      </div>
    );
  }

  if (!caseDetail) return null;

  const isFemale = caseDetail.gender === "feminino";
  const badgeClass = careTypeBadge[caseDetail.care_type ?? "Clínica Geral"] ?? careTypeBadge["Clínica Geral"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <Button variant="ghost" onClick={() => navigate(`/case/${id}`)} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Caso
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
          <h1 className="text-3xl font-bold mb-2">Editar Prontuário</h1>
          <div className="flex items-center gap-3 mt-3">
            <p className="text-muted-foreground font-medium">{caseDetail.patient_name}</p>
            <Badge className={`border text-xs px-2 py-0.5 ${badgeClass}`}>
              {caseDetail.care_type ?? "Clínica Geral"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Os dados do paciente não podem ser alterados nesta tela.</p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">

          <Card className="shadow-[var(--shadow-elevated)] border-l-4 border-l-blue-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-blue-500" />
                Anamnese Médica
              </CardTitle>
              <CardDescription>Edite as informações clínicas coletadas durante a consulta</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              <div className="space-y-2">
                <Label htmlFor="hpma">HPMA — História da Presente Moléstia Atual</Label>
                <Textarea
                  id="hpma"
                  placeholder="Quando iniciou, como iniciou, fatores de melhora/piora, evolução do quadro..."
                  value={formData.hpma}
                  onChange={update("hpma")}
                  rows={5}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="anamnesis">
                  Anamnese Geral
                  <span className="text-xs text-muted-foreground ml-1">(opcional)</span>
                </Label>
                <Textarea
                  id="anamnesis"
                  placeholder="Queixa principal e contexto geral do paciente nesta consulta..."
                  value={formData.anamnesis}
                  onChange={update("anamnesis")}
                  rows={3}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="antecedentes_pessoais">
                    Antecedentes Pessoais
                    <span className="text-xs text-muted-foreground ml-1">(opcional)</span>
                  </Label>
                  <Textarea
                    id="antecedentes_pessoais"
                    placeholder="Hospitalizações, doenças anteriores relevantes..."
                    value={formData.antecedentes_pessoais}
                    onChange={update("antecedentes_pessoais")}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="antecedentes_familiares">
                    Antecedentes Familiares
                    <span className="text-xs text-muted-foreground ml-1">(opcional)</span>
                  </Label>
                  <Textarea
                    id="antecedentes_familiares"
                    placeholder="Doenças hereditárias, histórico familiar..."
                    value={formData.antecedentes_familiares}
                    onChange={update("antecedentes_familiares")}
                    rows={3}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="antecedentes_cirurgicos">
                    Antecedentes Cirúrgicos
                    <span className="text-xs text-muted-foreground ml-1">(opcional)</span>
                  </Label>
                  <Textarea
                    id="antecedentes_cirurgicos"
                    placeholder="Cirurgias anteriores, internações, procedimentos relevantes..."
                    value={formData.antecedentes_cirurgicos}
                    onChange={update("antecedentes_cirurgicos")}
                    rows={3}
                  />
                </div>
                {isFemale && (
                  <div className="space-y-2">
                    <Label htmlFor="historia_gineco_obstetrica">
                      História Gineco-Obstétrica
                      <span className="text-xs text-muted-foreground ml-1">(opcional)</span>
                    </Label>
                    <Textarea
                      id="historia_gineco_obstetrica"
                      placeholder="Ciclo menstrual, gestações, partos, abortos, contraceptivos..."
                      value={formData.historia_gineco_obstetrica}
                      onChange={update("historia_gineco_obstetrica")}
                      rows={3}
                    />
                  </div>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="medicamentos_uso">Medicamentos em Uso</Label>
                  <Textarea
                    id="medicamentos_uso"
                    placeholder="Medicamentos atuais com posologia..."
                    value={formData.medicamentos_uso}
                    onChange={update("medicamentos_uso")}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="alergias">Alergias</Label>
                  <Textarea
                    id="alergias"
                    placeholder="Alergias medicamentosas, alimentares, ambientais..."
                    value={formData.alergias}
                    onChange={update("alergias")}
                    rows={3}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="habitos_vida">
                    Hábitos de Vida
                    <span className="text-xs text-muted-foreground ml-1">(opcional)</span>
                  </Label>
                  <Textarea
                    id="habitos_vida"
                    placeholder="Tabagismo, etilismo, atividade física, alimentação, sono..."
                    value={formData.habitos_vida}
                    onChange={update("habitos_vida")}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="revisao_sistemas">
                    Revisão por Sistemas
                    <span className="text-xs text-muted-foreground ml-1">(opcional)</span>
                  </Label>
                  <Textarea
                    id="revisao_sistemas"
                    placeholder="Alterações em outros sistemas..."
                    value={formData.revisao_sistemas}
                    onChange={update("revisao_sistemas")}
                    rows={3}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-[var(--shadow-elevated)] border-l-4 border-l-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Dados da Consulta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="symptoms">Sintomas Detalhados</Label>
                <Textarea
                  id="symptoms"
                  placeholder="Liste os sintomas atuais..."
                  value={formData.symptoms}
                  onChange={update("symptoms")}
                  rows={5}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="exams">
                  Exames Realizados
                  <span className="text-xs text-muted-foreground ml-1">(opcional)</span>
                </Label>
                <Textarea
                  id="exams"
                  placeholder="Resultados de exames laboratoriais ou de imagem..."
                  value={formData.exams}
                  onChange={update("exams")}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-[var(--shadow-elevated)] border-l-4 border-l-green-400">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PenLine className="w-5 h-5 text-green-600" />
                Conclusão do Médico
              </CardTitle>
              <CardDescription>Registre sua conclusão clínica ou conduta definida</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="doctor_conclusion">
                  Conclusão
                  <span className="text-xs text-muted-foreground ml-1">(opcional)</span>
                </Label>
                <Textarea
                  id="doctor_conclusion"
                  placeholder="Digite sua conclusão clínica, observações finais ou conduta definida..."
                  value={formData.doctor_conclusion}
                  onChange={update("doctor_conclusion")}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4 justify-end pb-8">
            <Button type="button" variant="outline" onClick={() => navigate(`/case/${id}`)}>
              Cancelar
            </Button>
            <Button type="submit" size="lg" className="gap-2 font-semibold" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default EditCase;
