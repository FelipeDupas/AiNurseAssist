import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Send, Stethoscope, User, ClipboardList, FileText, Baby, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

type CareType = "Clínica Geral" | "Urgência" | "Pediátrico";

const LOADING_STEPS = [
  "Preparando dados do paciente...",
  "Enviando para análise da IA...",
  "Identificando diagnósticos possíveis...",
  "Consultando base de CID-10...",
  "Calculando urgência e encaminhamento...",
  "Finalizando relatório clínico...",
];

const AddCase = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [careType, setCareType] = useState<CareType>("Clínica Geral");
  const [isChildDetected, setIsChildDetected] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    antecedentes_pessoais: "",
    antecedentes_familiares: "",
    antecedentes_cirurgicos: "",
    historia_gineco_obstetrica: "",
    habitos_vida: "",
    medicamentos_uso: "",
    alergias: "",
    revisao_sistemas: "",
    pediatric_responsible: "",
    pediatric_vaccines: "",
    pediatric_breastfed: "",
    pediatric_dnpm: "",
    symptoms: "",
    exams: ""
  });

  useEffect(() => {
    if (!formData.birthDate) { setIsChildDetected(false); return; }
    const nasc = new Date(formData.birthDate);
    const hoje = new Date();
    let idade = hoje.getFullYear() - nasc.getFullYear();
    const m = hoje.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
    setIsChildDetected(idade < 12 && idade >= 0);
  }, [formData.birthDate]);

  const showPediatric = careType === "Pediátrico" || isChildDetected;
  const showExtendedAnamnesis = careType !== "Urgência";

  const formatCPF = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  };

  const startLoadingSteps = () => {
    let stepIndex = 0;
    setLoadingStep(LOADING_STEPS[0]);
    intervalRef.current = setInterval(() => {
      stepIndex += 1;
      if (stepIndex < LOADING_STEPS.length) {
        setLoadingStep(LOADING_STEPS[stepIndex]);
      }
    }, 1500);
  };

  const stopLoadingSteps = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setLoadingStep("");
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
    startLoadingSteps();

    try {
      const effectiveCareType = isChildDetected && careType !== "Urgência" ? "Pediátrico" : careType;

      const response = await fetch(`http://127.0.0.1:8000/cases/?owner_id=${medico.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_data: {
            full_name: formData.fullName,
            birth_date: formData.birthDate,
            gender: formData.gender,
            cpf: formData.cpf || null,
            mother_name: formData.motherName || null,
            medical_history: formData.medicalHistory || null,
          },
          care_type: effectiveCareType,
          anamnesis: formData.anamnesis || null,
          hpma: formData.hpma || null,
          antecedentes_pessoais: formData.antecedentes_pessoais || null,
          antecedentes_familiares: formData.antecedentes_familiares || null,
          antecedentes_cirurgicos: formData.antecedentes_cirurgicos || null,
          historia_gineco_obstetrica: formData.historia_gineco_obstetrica || null,
          habitos_vida: formData.habitos_vida || null,
          medicamentos_uso: formData.medicamentos_uso || null,
          alergias: formData.alergias || null,
          revisao_sistemas: formData.revisao_sistemas || null,
          pediatric_responsible: formData.pediatric_responsible || null,
          pediatric_vaccines: formData.pediatric_vaccines || null,
          pediatric_breastfed: formData.pediatric_breastfed || null,
          pediatric_dnpm: formData.pediatric_dnpm || null,
          symptoms: formData.symptoms,
          exams: formData.exams || null,
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
      stopLoadingSteps();
      setLoading(false);
    }
  };

  const careTypeConfig = {
    "Clínica Geral": { color: "bg-blue-100 text-blue-800 border-blue-300", border: "border-l-blue-500", icon: <Stethoscope className="w-5 h-5 text-blue-500" /> },
    "Urgência": { color: "bg-red-100 text-red-800 border-red-300", border: "border-l-red-500", icon: <AlertTriangle className="w-5 h-5 text-red-500" /> },
    "Pediátrico": { color: "bg-purple-100 text-purple-800 border-purple-300", border: "border-l-purple-500", icon: <Baby className="w-5 h-5 text-purple-500" /> },
  };
  const currentConfig = careTypeConfig[careType];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
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
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Novo Caso Clínico</h1>
          <p className="text-muted-foreground">
            Selecione o tipo de atendimento e preencha os dados para que a IA realize a análise clínica.
          </p>
        </div>

        <Card className="shadow-[var(--shadow-elevated)] mb-6 border-2">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Tipo de Atendimento</CardTitle>
            <CardDescription>Define o fluxo clínico e adapta a análise da IA</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {(["Clínica Geral", "Urgência", "Pediátrico"] as CareType[]).map((type) => {
                const cfg = careTypeConfig[type];
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setCareType(type)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all font-medium text-sm
                      ${careType === type
                        ? `${cfg.color} border-current shadow-md scale-[1.02]`
                        : "border-muted bg-muted/30 hover:bg-muted/60 text-muted-foreground"
                      }`}
                  >
                    {cfg.icon}
                    {type}
                  </button>
                );
              })}
            </div>
            {isChildDetected && careType !== "Urgência" && (
              <p className="mt-3 text-xs text-purple-600 bg-purple-50 border border-purple-200 rounded-lg px-3 py-2">
                Paciente pediátrico detectado pela data de nascimento — campos pediátricos serão exibidos automaticamente.
              </p>
            )}
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-6">

          <Card className="shadow-[var(--shadow-elevated)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Dados do Paciente
              </CardTitle>
              <CardDescription>
                CPF e Nome da Mãe são essenciais para conformidade legal e identificação do prontuário.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nome Completo *</Label>
                  <Input
                    id="fullName"
                    placeholder="Nome completo do paciente"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birthDate">Data de Nascimento *</Label>
                  <Input
                    id="birthDate"
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="gender">Sexo *</Label>
                  <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })}>
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
                    onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
                    maxLength={14}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="motherName">
                  Nome da Mãe <span className="text-xs text-primary font-semibold">(crítico para registros)</span>
                </Label>
                <Input
                  id="motherName"
                  placeholder="Nome completo da mãe do paciente"
                  value={formData.motherName}
                  onChange={(e) => setFormData({ ...formData, motherName: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="medicalHistory">Histórico Médico Base</Label>
                <Textarea
                  id="medicalHistory"
                  placeholder="Doenças crônicas, condições preexistentes, cirurgias anteriores..."
                  value={formData.medicalHistory}
                  onChange={(e) => setFormData({ ...formData, medicalHistory: e.target.value })}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {showPediatric && (
            <Card className="shadow-[var(--shadow-elevated)] border-l-4 border-l-purple-400">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Baby className="w-5 h-5 text-purple-500" />
                  Dados Pediátricos
                  <Badge className="bg-purple-100 text-purple-700 border-purple-300 text-xs">Detectado automaticamente</Badge>
                </CardTitle>
                <CardDescription>Informações específicas para atendimento pediátrico</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pediatric_responsible">Responsável Legal</Label>
                  <Input
                    id="pediatric_responsible"
                    placeholder="Nome do responsável (pai, mãe ou tutor)"
                    value={formData.pediatric_responsible}
                    onChange={(e) => setFormData({ ...formData, pediatric_responsible: e.target.value })}
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pediatric_vaccines">Situação Vacinal</Label>
                    <Select
                      value={formData.pediatric_vaccines}
                      onValueChange={(value) => setFormData({ ...formData, pediatric_vaccines: value })}
                    >
                      <SelectTrigger id="pediatric_vaccines">
                        <SelectValue placeholder="Carteira de vacinação" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Em dia">Em dia</SelectItem>
                        <SelectItem value="Incompleta">Incompleta</SelectItem>
                        <SelectItem value="Não vacinado">Não vacinado</SelectItem>
                        <SelectItem value="Não sabe informar">Não sabe informar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pediatric_breastfed">Aleitamento Materno</Label>
                    <Select
                      value={formData.pediatric_breastfed}
                      onValueChange={(value) => setFormData({ ...formData, pediatric_breastfed: value })}
                    >
                      <SelectTrigger id="pediatric_breastfed">
                        <SelectValue placeholder="Situação do aleitamento" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Aleitamento exclusivo">Aleitamento exclusivo</SelectItem>
                        <SelectItem value="Aleitamento misto">Aleitamento misto</SelectItem>
                        <SelectItem value="Desmamado">Desmamado</SelectItem>
                        <SelectItem value="Nunca amamentado">Nunca amamentado</SelectItem>
                        <SelectItem value="Não se aplica">Não se aplica (&gt;2 anos)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pediatric_dnpm">Desenvolvimento Neuropsicomotor (DNPM)</Label>
                  <Textarea
                    id="pediatric_dnpm"
                    placeholder="Ex: Desenvolvimento adequado para a idade. Sentou aos 6 meses, andou aos 12 meses, primeiras palavras aos 14 meses..."
                    value={formData.pediatric_dnpm}
                    onChange={(e) => setFormData({ ...formData, pediatric_dnpm: e.target.value })}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          <Card className={`shadow-[var(--shadow-elevated)] border-l-4 ${currentConfig.border}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-blue-500" />
                Anamnese Médica
                {careType === "Urgência" && (
                  <Badge className="bg-red-100 text-red-700 text-xs">Modo Urgência — campos essenciais</Badge>
                )}
              </CardTitle>
              <CardDescription>
                {careType === "Urgência"
                  ? "Foque na queixa principal e evolução imediata do quadro."
                  : "Coleta sistemática do histórico de saúde do paciente nesta consulta."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              <div className="space-y-2">
                <Label htmlFor="hpma">
                  HPMA — História da Presente Moléstia Atual
                  {careType === "Urgência" && <span className="text-red-600 ml-1">*</span>}
                </Label>
                <Textarea
                  id="hpma"
                  placeholder="Quando iniciou, como iniciou, fatores de melhora/piora, irradiação, sintomas associados, tratamentos já realizados, evolução do quadro..."
                  value={formData.hpma}
                  onChange={(e) => setFormData({ ...formData, hpma: e.target.value })}
                  rows={5}
                />
              </div>

              {showExtendedAnamnesis && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="anamnesis">
                      Anamnese Geral
                      <span className="text-xs text-muted-foreground ml-1">(opcional)</span>
                    </Label>
                    <Textarea
                      id="anamnesis"
                      placeholder="Queixa principal e contexto geral do paciente nesta consulta..."
                      value={formData.anamnesis}
                      onChange={(e) => setFormData({ ...formData, anamnesis: e.target.value })}
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
                        onChange={(e) => setFormData({ ...formData, antecedentes_pessoais: e.target.value })}
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
                        placeholder="Doenças hereditárias, histórico familiar de HAS, DM, câncer, doenças cardíacas..."
                        value={formData.antecedentes_familiares}
                        onChange={(e) => setFormData({ ...formData, antecedentes_familiares: e.target.value })}
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
                        onChange={(e) => setFormData({ ...formData, antecedentes_cirurgicos: e.target.value })}
                        rows={3}
                      />
                    </div>
                    {formData.gender === "feminino" && (
                      <div className="space-y-2">
                        <Label htmlFor="historia_gineco_obstetrica">
                          História Gineco-Obstétrica
                          <span className="text-xs text-muted-foreground ml-1">(opcional)</span>
                        </Label>
                        <Textarea
                          id="historia_gineco_obstetrica"
                          placeholder="Ciclo menstrual, gestações, partos, abortos, uso de contraceptivos..."
                          value={formData.historia_gineco_obstetrica}
                          onChange={(e) => setFormData({ ...formData, historia_gineco_obstetrica: e.target.value })}
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
                        placeholder="Liste os medicamentos atuais com posologia (ex: Metformina 850mg 2x/dia)..."
                        value={formData.medicamentos_uso}
                        onChange={(e) => setFormData({ ...formData, medicamentos_uso: e.target.value })}
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="alergias">Alergias</Label>
                      <Textarea
                        id="alergias"
                        placeholder="Alergias medicamentosas, alimentares, ambientais e reações adversas conhecidas..."
                        value={formData.alergias}
                        onChange={(e) => setFormData({ ...formData, alergias: e.target.value })}
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
                        placeholder="Tabagismo (carga tabágica), etilismo, atividade física, alimentação, sono..."
                        value={formData.habitos_vida}
                        onChange={(e) => setFormData({ ...formData, habitos_vida: e.target.value })}
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
                        placeholder="Alterações em outros sistemas: cardiovascular, respiratório, GI, neurológico, urinário..."
                        value={formData.revisao_sistemas}
                        onChange={(e) => setFormData({ ...formData, revisao_sistemas: e.target.value })}
                        rows={3}
                      />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-[var(--shadow-elevated)] border-l-4 border-l-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Dados da Consulta Atual
              </CardTitle>
              <CardDescription>Sintomas e exames para análise pela IA</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="symptoms">Sintomas Detalhados *</Label>
                <Textarea
                  id="symptoms"
                  placeholder="Liste os sintomas atuais: dor (localização, intensidade, caráter), febre, dispneia, tontura, náusea, etc..."
                  value={formData.symptoms}
                  onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
                  rows={5}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="exams">
                  Exames Realizados
                  <span className="text-xs text-muted-foreground ml-1">(opcional)</span>
                </Label>
                <Textarea
                  id="exams"
                  placeholder="Resultados de exames laboratoriais, de imagem ou outros realizados anteriormente ou nesta consulta..."
                  value={formData.exams}
                  onChange={(e) => setFormData({ ...formData, exams: e.target.value })}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4 justify-end pb-8">
            <Button type="button" variant="outline" onClick={() => navigate("/dashboard")}>
              Cancelar
            </Button>
            <Button type="submit" size="lg" className="gap-2 font-semibold min-w-[260px]" disabled={loading}>
              <Send className="w-4 h-4" />
              {loading ? loadingStep || "Analisando com IA..." : "Analisar e Cadastrar"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default AddCase;
