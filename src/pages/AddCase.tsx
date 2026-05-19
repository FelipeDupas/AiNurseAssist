import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, ArrowRight, Send, Check,
  Stethoscope, User, ClipboardList, FileText, Baby, AlertTriangle,
} from "lucide-react";
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

const DRAFT_KEY = "nurseai_rascunho_caso";
const TOTAL_STEPS = 4;
const STEP_LABELS = ["Dados do Paciente", "Anamnese", "Sintomas e Exames", "Revisão Final"];

// Valida dígitos verificadores do CPF
const validarCPF = (cpf: string): boolean => {
  const nums = cpf.replace(/\D/g, "");
  if (nums.length !== 11 || /^(\d)\1{10}$/.test(nums)) return false;
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(nums[i]) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(nums[9])) return false;
  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(nums[i]) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  return resto === parseInt(nums[10]);
};

const formDefault = {
  fullName: "", birthDate: "", gender: "", cpf: "", motherName: "",
  medicalHistory: "", anamnesis: "", hpma: "",
  antecedentes_pessoais: "", antecedentes_familiares: "", antecedentes_cirurgicos: "",
  historia_gineco_obstetrica: "", habitos_vida: "", medicamentos_uso: "",
  alergias: "", revisao_sistemas: "",
  pediatric_responsible: "", pediatric_vaccines: "", pediatric_breastfed: "", pediatric_dnpm: "",
  symptoms: "", exams: "",
};
type FormData = typeof formDefault;

const AddCase = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [careType, setCareType] = useState<CareType>("Clínica Geral");
  const [isChildDetected, setIsChildDetected] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [erros, setErros] = useState<Record<string, string>>({});

  // Stepper
  const [step, setStep] = useState(1);

  // Rascunho
  const [draftDialogOpen, setDraftDialogOpen] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<{ formData: FormData; careType: CareType; step: number } | null>(null);
  const draftChecked = useRef(false);

  const medicoString = localStorage.getItem("medico");
  const medico = medicoString ? JSON.parse(medicoString) : null;

  const [formData, setFormData] = useState<FormData>({ ...formDefault });

  // --- Detecção pediátrica ---
  useEffect(() => {
    if (!formData.birthDate) { setIsChildDetected(false); return; }
    const [ano, mes, dia] = formData.birthDate.split("-").map(Number);
    const nasc = new Date(ano, mes - 1, dia);
    const hoje = new Date();
    let idade = hoje.getFullYear() - nasc.getFullYear();
    const m = hoje.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
    setIsChildDetected(idade < 12 && idade >= 0);
  }, [formData.birthDate]);

  // --- Verificar rascunho salvo no mount ---
  useEffect(() => {
    if (draftChecked.current) return;
    draftChecked.current = true;
    const saved = localStorage.getItem(DRAFT_KEY);
    if (!saved) return;
    try {
      const draft = JSON.parse(saved);
      if (draft.formData?.fullName?.trim() || draft.formData?.symptoms?.trim()) {
        setPendingDraft(draft);
        setDraftDialogOpen(true);
      }
    } catch {
      localStorage.removeItem(DRAFT_KEY);
    }
  }, []);

  // --- Auto-salvamento do rascunho ---
  useEffect(() => {
    if (draftDialogOpen) return;
    const temDados = formData.fullName.trim() || formData.symptoms.trim() || formData.birthDate;
    if (temDados) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ formData, careType, step }));
    }
  }, [formData, careType, step, draftDialogOpen]);

  const handleRestoreDraft = () => {
    if (pendingDraft) {
      setFormData(pendingDraft.formData);
      setCareType(pendingDraft.careType || "Clínica Geral");
      setStep(pendingDraft.step || 1);
    }
    setDraftDialogOpen(false);
  };

  const handleDiscardDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setDraftDialogOpen(false);
  };

  // --- Helpers ---
  const formatCPF = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  };

  const formatarData = (isoDate: string) => {
    if (!isoDate) return "—";
    const [ano, mes, dia] = isoDate.split("-");
    return `${dia}/${mes}/${ano}`;
  };

  const update = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (erros[field]) setErros(prev => { const next = { ...prev }; delete next[field]; return next; });
  };

  // --- Validação por etapa ---
  const validarEtapa = (etapa: number): boolean => {
    const novosErros: Record<string, string> = {};

    if (etapa === 1) {
      const partes = formData.fullName.trim().split(/\s+/);
      if (!formData.fullName.trim() || partes.length < 2 || partes.some(p => p.length < 2)) {
        novosErros.fullName = "Informe o nome completo com pelo menos dois nomes.";
      }
      if (!formData.birthDate) {
        novosErros.birthDate = "Data de nascimento é obrigatória.";
      } else {
        const [ano, mes, dia] = formData.birthDate.split("-").map(Number);
        if (new Date(ano, mes - 1, dia) > new Date()) {
          novosErros.birthDate = "A data de nascimento não pode ser futura.";
        }
      }
      if (!formData.gender) {
        novosErros.gender = "Selecione o sexo do paciente.";
      }
      if (formData.cpf && !validarCPF(formData.cpf)) {
        novosErros.cpf = "CPF inválido. Verifique os dígitos verificadores.";
      }
    }

    if (etapa === 2 && careType === "Urgência" && !formData.hpma.trim()) {
      novosErros.hpma = "HPMA é obrigatório para atendimentos de urgência.";
    }

    if (etapa === 3 && !formData.symptoms.trim()) {
      novosErros.symptoms = "Descreva os sintomas do paciente.";
    }

    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  // --- Navegação entre etapas ---
  const handleNext = () => {
    if (validarEtapa(step)) {
      setErros({});
      setStep(s => s + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      toast.error("Corrija os erros indicados antes de avançar.");
    }
  };

  const handleBack = () => {
    setErros({});
    setStep(s => s - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleGoToStep = (target: number) => {
    if (target < step) { setErros({}); setStep(target); window.scrollTo({ top: 0, behavior: "smooth" }); }
  };

  // --- Loading steps ---
  const startLoadingSteps = () => {
    let i = 0;
    setLoadingStep(LOADING_STEPS[0]);
    intervalRef.current = setInterval(() => {
      i += 1;
      if (i < LOADING_STEPS.length) setLoadingStep(LOADING_STEPS[i]);
    }, 1500);
  };

  const stopLoadingSteps = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setLoadingStep("");
  };

  // --- Envio ---
  const handleSubmit = async () => {
    if (!medico?.id) { toast.error("Erro de sessão. Faça login novamente."); navigate("/login"); return; }
    if (!validarEtapa(3)) { toast.error("Corrija os erros antes de enviar."); return; }

    setLoading(true);
    startLoadingSteps();

    try {
      const effectiveCareType = isChildDetected && careType !== "Urgência" ? "Pediátrico" : careType;
      const response = await fetch(`${API_URL}/cases/?owner_id=${medico.id}`, {
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
        localStorage.removeItem(DRAFT_KEY);
        toast.success("Caso analisado pela IA com sucesso!");
        navigate(`/case/${data.id}`);
      } else {
        const error = await response.json();
        toast.error("Erro ao enviar: " + (error.detail || "Erro desconhecido"));
      }
    } catch {
      toast.error("Erro de conexão com o servidor.");
    } finally {
      stopLoadingSteps();
      setLoading(false);
    }
  };

  // --- Computed ---
  const showPediatric = careType === "Pediátrico" || isChildDetected;
  const showExtendedAnamnesis = careType !== "Urgência";
  const effectiveCareType = isChildDetected && careType !== "Urgência" ? "Pediátrico" : careType;

  const careTypeConfig = {
    "Clínica Geral": { color: "bg-blue-100 text-blue-800 border-blue-300", border: "border-l-blue-500", icon: <Stethoscope className="w-5 h-5 text-blue-500" /> },
    "Urgência":      { color: "bg-red-100 text-red-800 border-red-300",    border: "border-l-red-500",  icon: <AlertTriangle className="w-5 h-5 text-red-500" /> },
    "Pediátrico":    { color: "bg-purple-100 text-purple-800 border-purple-300", border: "border-l-purple-500", icon: <Baby className="w-5 h-5 text-purple-500" /> },
  };
  const currentConfig = careTypeConfig[careType];

  // Campo de erro helper
  const ErrMsg = ({ campo }: { campo: string }) =>
    erros[campo] ? <p className="text-xs text-destructive mt-1" role="alert">{erros[campo]}</p> : null;

  const inputClass = (campo: string) => erros[campo] ? "border-destructive focus-visible:ring-destructive" : "";

  // =================== RENDER ===================
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">

      {/* --- Dialog: restaurar rascunho --- */}
      <AlertDialog open={draftDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rascunho encontrado</AlertDialogTitle>
            <AlertDialogDescription>
              Encontramos um rascunho salvo para este formulário. Deseja continuar de onde parou?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDiscardDraft}>Descartar e começar do zero</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestoreDraft}>Continuar rascunho</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* --- Cabeçalho --- */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <Button variant="ghost" onClick={() => navigate("/dashboard")} className="gap-2">
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Voltar ao Dashboard
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Stethoscope className="w-4 h-4 text-primary-foreground" aria-hidden="true" />
            </div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              AI Nurse Assist
            </h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-4xl">

        {/* --- Título --- */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-1">Novo Caso Clínico</h1>
          <p className="text-muted-foreground">Preencha as etapas abaixo para que a IA realize a análise clínica.</p>
        </div>

        {/* ===================== INDICADOR DE PROGRESSO ===================== */}
        <div className="mb-8">
          <div className="flex items-start">
            {STEP_LABELS.map((label, index) => {
              const n = index + 1;
              const concluida = step > n;
              const ativa = step === n;
              const clicavel = n < step;
              return (
                <div key={n} className="flex items-start flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-1.5 min-w-[2.25rem]">
                    <button
                      type="button"
                      onClick={() => clicavel && handleGoToStep(n)}
                      disabled={!clicavel && !ativa}
                      aria-label={`Etapa ${n}: ${label}${concluida ? " (concluída — clique para editar)" : ativa ? " (etapa atual)" : " (ainda não disponível)"}`}
                      className={[
                        "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all",
                        concluida ? "bg-primary border-primary text-primary-foreground" : "",
                        ativa ? "bg-primary border-primary text-primary-foreground ring-4 ring-primary/20" : "",
                        !concluida && !ativa ? "border-muted-foreground/30 text-muted-foreground" : "",
                        clicavel ? "cursor-pointer hover:ring-4 hover:ring-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" : "cursor-default",
                      ].filter(Boolean).join(" ")}
                    >
                      {concluida ? <Check className="w-4 h-4" aria-hidden="true" /> : n}
                    </button>
                    <span className={`text-xs font-medium text-center leading-tight hidden sm:block ${ativa ? "text-foreground" : "text-muted-foreground"}`}>
                      {label}
                    </span>
                  </div>
                  {index < STEP_LABELS.length - 1 && (
                    <div className={`flex-1 h-0.5 mt-[1.125rem] mx-1 transition-colors ${step > n ? "bg-primary" : "bg-muted-foreground/20"}`} />
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-sm text-muted-foreground mt-3 sm:hidden text-center">
            Etapa {step} de {TOTAL_STEPS} — {STEP_LABELS[step - 1]}
          </p>
        </div>

        {/* ===================== ETAPA 1: Tipo + Dados do Paciente ===================== */}
        {step === 1 && (
          <div className="space-y-6">
            {/* Tipo de atendimento */}
            <Card className="shadow-[var(--shadow-elevated)] border-2">
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
                        aria-pressed={careType === type}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all font-medium text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                          ${careType === type
                            ? `${cfg.color} border-current shadow-md scale-[1.02]`
                            : "border-muted bg-muted/30 hover:bg-muted/60 text-muted-foreground"}`}
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

            {/* Dados do paciente */}
            <Card className="shadow-[var(--shadow-elevated)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" aria-hidden="true" />
                  Dados do Paciente
                </CardTitle>
                <CardDescription>CPF e Nome da Mãe são essenciais para conformidade legal e identificação do prontuário.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Nome Completo *</Label>
                    <Input
                      id="fullName"
                      placeholder="Nome completo do paciente"
                      value={formData.fullName}
                      onChange={(e) => update("fullName", e.target.value)}
                      aria-invalid={!!erros.fullName}
                      aria-describedby={erros.fullName ? "err-fullName" : undefined}
                      className={inputClass("fullName")}
                    />
                    <ErrMsg campo="fullName" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="birthDate">Data de Nascimento *</Label>
                    <Input
                      id="birthDate"
                      type="date"
                      max={new Date().toISOString().split("T")[0]}
                      value={formData.birthDate}
                      onChange={(e) => update("birthDate", e.target.value)}
                      aria-invalid={!!erros.birthDate}
                      aria-describedby={erros.birthDate ? "err-birthDate" : undefined}
                      className={inputClass("birthDate")}
                    />
                    <ErrMsg campo="birthDate" />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="gender">Sexo *</Label>
                    <Select value={formData.gender} onValueChange={(v) => update("gender", v)}>
                      <SelectTrigger
                        id="gender"
                        aria-invalid={!!erros.gender}
                        className={inputClass("gender")}
                      >
                        <SelectValue placeholder="Selecione o sexo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="masculino">Masculino</SelectItem>
                        <SelectItem value="feminino">Feminino</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                    <ErrMsg campo="gender" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cpf">
                      CPF <span className="text-xs text-primary font-semibold">(crítico para registros)</span>
                    </Label>
                    <Input
                      id="cpf"
                      placeholder="000.000.000-00"
                      value={formData.cpf}
                      onChange={(e) => update("cpf", formatCPF(e.target.value))}
                      maxLength={14}
                      aria-invalid={!!erros.cpf}
                      aria-describedby={erros.cpf ? "err-cpf" : undefined}
                      className={inputClass("cpf")}
                    />
                    <ErrMsg campo="cpf" />
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
                    onChange={(e) => update("motherName", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="medicalHistory">Histórico Médico Base</Label>
                  <Textarea
                    id="medicalHistory"
                    placeholder="Doenças crônicas, condições preexistentes, cirurgias anteriores..."
                    value={formData.medicalHistory}
                    onChange={(e) => update("medicalHistory", e.target.value)}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Dados pediátricos (se aplicável) */}
            {showPediatric && (
              <Card className="shadow-[var(--shadow-elevated)] border-l-4 border-l-purple-400">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Baby className="w-5 h-5 text-purple-500" aria-hidden="true" />
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
                      onChange={(e) => update("pediatric_responsible", e.target.value)}
                    />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="pediatric_vaccines">Situação Vacinal</Label>
                      <Select value={formData.pediatric_vaccines} onValueChange={(v) => update("pediatric_vaccines", v)}>
                        <SelectTrigger id="pediatric_vaccines"><SelectValue placeholder="Carteira de vacinação" /></SelectTrigger>
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
                      <Select value={formData.pediatric_breastfed} onValueChange={(v) => update("pediatric_breastfed", v)}>
                        <SelectTrigger id="pediatric_breastfed"><SelectValue placeholder="Situação do aleitamento" /></SelectTrigger>
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
                      placeholder="Ex: Desenvolvimento adequado para a idade. Sentou aos 6 meses, andou aos 12 meses..."
                      value={formData.pediatric_dnpm}
                      onChange={(e) => update("pediatric_dnpm", e.target.value)}
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ===================== ETAPA 2: Anamnese ===================== */}
        {step === 2 && (
          <Card className={`shadow-[var(--shadow-elevated)] border-l-4 ${currentConfig.border}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-blue-500" aria-hidden="true" />
                Anamnese Médica
                {careType === "Urgência" && (
                  <Badge className="bg-red-100 text-red-700 text-xs">Modo Urgência — foque na HPMA</Badge>
                )}
              </CardTitle>
              <CardDescription>
                {careType === "Urgência"
                  ? "Foque na queixa principal e evolução imediata do quadro. HPMA é obrigatória neste modo."
                  : "Coleta sistemática do histórico de saúde do paciente. Todos os campos são opcionais exceto quando indicado."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="hpma">
                  HPMA — História da Presente Moléstia Atual
                  {careType === "Urgência" && <span className="text-destructive ml-1">*</span>}
                </Label>
                <Textarea
                  id="hpma"
                  placeholder="Quando iniciou, como iniciou, fatores de melhora/piora, irradiação, sintomas associados, tratamentos já realizados, evolução do quadro..."
                  value={formData.hpma}
                  onChange={(e) => update("hpma", e.target.value)}
                  rows={5}
                  aria-invalid={!!erros.hpma}
                  className={inputClass("hpma")}
                />
                <ErrMsg campo="hpma" />
              </div>

              {showExtendedAnamnesis && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="anamnesis">Anamnese Geral <span className="text-xs text-muted-foreground">(opcional)</span></Label>
                    <Textarea
                      id="anamnesis"
                      placeholder="Queixa principal e contexto geral do paciente nesta consulta..."
                      value={formData.anamnesis}
                      onChange={(e) => update("anamnesis", e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="antecedentes_pessoais">Antecedentes Pessoais <span className="text-xs text-muted-foreground">(opcional)</span></Label>
                      <Textarea id="antecedentes_pessoais" placeholder="Hospitalizações, doenças anteriores relevantes..." value={formData.antecedentes_pessoais} onChange={(e) => update("antecedentes_pessoais", e.target.value)} rows={3} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="antecedentes_familiares">Antecedentes Familiares <span className="text-xs text-muted-foreground">(opcional)</span></Label>
                      <Textarea id="antecedentes_familiares" placeholder="Doenças hereditárias, histórico familiar de HAS, DM, câncer..." value={formData.antecedentes_familiares} onChange={(e) => update("antecedentes_familiares", e.target.value)} rows={3} />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="antecedentes_cirurgicos">Antecedentes Cirúrgicos <span className="text-xs text-muted-foreground">(opcional)</span></Label>
                      <Textarea id="antecedentes_cirurgicos" placeholder="Cirurgias anteriores, internações, procedimentos relevantes..." value={formData.antecedentes_cirurgicos} onChange={(e) => update("antecedentes_cirurgicos", e.target.value)} rows={3} />
                    </div>
                    {formData.gender === "feminino" && (
                      <div className="space-y-2">
                        <Label htmlFor="historia_gineco_obstetrica">História Gineco-Obstétrica <span className="text-xs text-muted-foreground">(opcional)</span></Label>
                        <Textarea id="historia_gineco_obstetrica" placeholder="Ciclo menstrual, gestações, partos, uso de contraceptivos..." value={formData.historia_gineco_obstetrica} onChange={(e) => update("historia_gineco_obstetrica", e.target.value)} rows={3} />
                      </div>
                    )}
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="medicamentos_uso">Medicamentos em Uso</Label>
                      <Textarea id="medicamentos_uso" placeholder="Liste os medicamentos atuais com posologia..." value={formData.medicamentos_uso} onChange={(e) => update("medicamentos_uso", e.target.value)} rows={3} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="alergias">Alergias</Label>
                      <Textarea id="alergias" placeholder="Alergias medicamentosas, alimentares, ambientais..." value={formData.alergias} onChange={(e) => update("alergias", e.target.value)} rows={3} />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="habitos_vida">Hábitos de Vida <span className="text-xs text-muted-foreground">(opcional)</span></Label>
                      <Textarea id="habitos_vida" placeholder="Tabagismo, etilismo, atividade física, alimentação, sono..." value={formData.habitos_vida} onChange={(e) => update("habitos_vida", e.target.value)} rows={3} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="revisao_sistemas">Revisão por Sistemas <span className="text-xs text-muted-foreground">(opcional)</span></Label>
                      <Textarea id="revisao_sistemas" placeholder="Alterações em outros sistemas: cardiovascular, respiratório, GI, neurológico..." value={formData.revisao_sistemas} onChange={(e) => update("revisao_sistemas", e.target.value)} rows={3} />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* ===================== ETAPA 3: Sintomas e Exames ===================== */}
        {step === 3 && (
          <Card className="shadow-[var(--shadow-elevated)] border-l-4 border-l-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" aria-hidden="true" />
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
                  onChange={(e) => update("symptoms", e.target.value)}
                  rows={6}
                  aria-invalid={!!erros.symptoms}
                  aria-describedby={erros.symptoms ? "err-symptoms" : undefined}
                  className={inputClass("symptoms")}
                />
                <ErrMsg campo="symptoms" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="exams">Exames Realizados <span className="text-xs text-muted-foreground">(opcional)</span></Label>
                <Textarea
                  id="exams"
                  placeholder="Resultados de exames laboratoriais, de imagem ou outros realizados anteriormente ou nesta consulta..."
                  value={formData.exams}
                  onChange={(e) => update("exams", e.target.value)}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* ===================== ETAPA 4: Revisão Final ===================== */}
        {step === 4 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Revise os dados antes de enviar para análise. Clique em qualquer etapa anterior no indicador de progresso para editar.
            </p>

            {/* Tipo de atendimento */}
            <div className={`flex items-center gap-3 p-4 rounded-xl border-l-4 ${currentConfig.border} bg-muted/30`}>
              {currentConfig.icon}
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Tipo de Atendimento</p>
                <p className="font-semibold">{effectiveCareType}</p>
              </div>
            </div>

            {/* Dados do paciente */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" aria-hidden="true" /> Dados do Paciente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Nome</dt>
                    <dd className="font-medium">{formData.fullName || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Nascimento</dt>
                    <dd>{formData.birthDate ? formatarData(formData.birthDate) : "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Sexo</dt>
                    <dd className="capitalize">{formData.gender || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">CPF</dt>
                    <dd>{formData.cpf || "—"}</dd>
                  </div>
                  {formData.motherName && (
                    <div className="sm:col-span-2">
                      <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Nome da Mãe</dt>
                      <dd>{formData.motherName}</dd>
                    </div>
                  )}
                  {formData.medicalHistory && (
                    <div className="sm:col-span-2">
                      <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Histórico Médico</dt>
                      <dd className="line-clamp-2 text-muted-foreground">{formData.medicalHistory}</dd>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>

            {/* Anamnese resumida */}
            {(formData.hpma || formData.anamnesis) && (
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-blue-500" aria-hidden="true" /> Anamnese
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {formData.hpma && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">HPMA</p>
                      <p className="bg-muted/40 p-3 rounded-lg leading-relaxed line-clamp-4">{formData.hpma}</p>
                    </div>
                  )}
                  {formData.anamnesis && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Anamnese Geral</p>
                      <p className="bg-muted/40 p-3 rounded-lg leading-relaxed line-clamp-3">{formData.anamnesis}</p>
                    </div>
                  )}
                  {(() => {
                    const extras = [
                      formData.antecedentes_pessoais, formData.antecedentes_familiares,
                      formData.antecedentes_cirurgicos, formData.habitos_vida,
                      formData.medicamentos_uso, formData.alergias, formData.revisao_sistemas,
                    ].filter(Boolean).length;
                    return extras > 0 ? (
                      <p className="text-xs text-muted-foreground">+ {extras} campo(s) adicional(is) preenchido(s)</p>
                    ) : null;
                  })()}
                </CardContent>
              </Card>
            )}

            {/* Sintomas */}
            <Card className={`shadow-sm border-l-4 ${formData.symptoms.trim() ? "border-l-primary" : "border-l-destructive"}`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" aria-hidden="true" /> Sintomas e Exames
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-3">
                {formData.symptoms.trim() ? (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Sintomas</p>
                    <p className="bg-muted/40 p-3 rounded-lg leading-relaxed line-clamp-4">{formData.symptoms}</p>
                  </div>
                ) : (
                  <p className="text-destructive font-medium text-sm">
                    ⚠ Sintomas não preenchidos — obrigatório. Volte à Etapa 3.
                  </p>
                )}
                {formData.exams && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Exames Realizados</p>
                    <p className="bg-muted/40 p-3 rounded-lg leading-relaxed line-clamp-3">{formData.exams}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ===================== BOTÕES DE NAVEGAÇÃO ===================== */}
        <div className={`flex mt-8 pb-8 ${step > 1 ? "justify-between" : "justify-end"}`}>
          {step > 1 && (
            <Button type="button" variant="outline" onClick={handleBack} className="gap-2" disabled={loading}>
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              Anterior
            </Button>
          )}

          {step < TOTAL_STEPS && (
            <Button type="button" onClick={handleNext} className="gap-2">
              Próximo
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Button>
          )}

          {step === TOTAL_STEPS && (
            <Button
              type="button"
              size="lg"
              className="gap-2 font-semibold min-w-[260px]"
              disabled={loading || !formData.symptoms.trim()}
              onClick={handleSubmit}
            >
              <Send className="w-4 h-4" aria-hidden="true" />
              {loading ? loadingStep || "Analisando com IA..." : "Analisar e Cadastrar"}
            </Button>
          )}
        </div>

      </main>
    </div>
  );
};

export default AddCase;
