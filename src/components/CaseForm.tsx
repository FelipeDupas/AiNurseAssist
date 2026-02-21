import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, Send } from "lucide-react";

interface CaseFormProps {
  initialData?: any;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

export const CaseForm = ({ initialData, onSubmit, isLoading }: CaseFormProps) => {
  const [formData, setFormData] = useState({
    fullName: "",
    birthDate: "",
    gender: "",
    medicalHistory: "",
    symptoms: "",
    exams: ""
  });

  // Efeito para preencher o formulário se for edição (ex: o caso do Gabriel)
  useEffect(() => {
    if (initialData) {
      setFormData({
        fullName: initialData.patient_name || "",
        birthDate: initialData.birth_date || "",
        gender: initialData.gender || "",
        medicalHistory: initialData.medical_history || "",
        symptoms: initialData.symptoms || "",
        exams: initialData.exams_input || "" // Mantenha 'exams' aqui para bater com o schema
      });
    }
  }, [initialData]);

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }} className="space-y-4">
      <div className="grid gap-2">
        <Label>Nome do Paciente</Label>
        <Input 
          value={formData.fullName} 
          onChange={e => setFormData({...formData, fullName: e.target.value})} 
          required 
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>Data de Nascimento</Label>
          <Input 
            type="date" // Mudança para seletor de data
            value={formData.birthDate} 
            onChange={e => setFormData({...formData, birthDate: e.target.value})} 
            required 
          />
        </div>
        <div className="grid gap-2">
          <Label>Gênero</Label>
          <Input 
            value={formData.gender} 
            onChange={e => setFormData({...formData, gender: e.target.value})} 
            required 
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label>Anamnese / Histórico</Label>
        <Textarea 
          value={formData.medicalHistory} 
          onChange={e => setFormData({...formData, medicalHistory: e.target.value})} 
        />
      </div>
      <div className="grid gap-2">
        <Label>Sintomas Atuais</Label>
        <Textarea 
          value={formData.symptoms} 
          onChange={e => setFormData({...formData, symptoms: e.target.value})} 
          required 
        />
      </div>
      <div className="grid gap-2">
        <Label>Exames Prévios</Label>
        <Textarea 
          value={formData.exams} 
          onChange={e => setFormData({...formData, exams: e.target.value})} 
        />
      </div>
      <Button type="submit" className="w-full gap-2" disabled={isLoading}>
        {isLoading ? <Loader2 className="animate-spin w-4 h-4" /> : initialData ? <Save className="w-4 h-4" /> : <Send className="w-4 h-4" />}
        {initialData ? "Atualizar e Reanalisar" : "Submeter para IA"}
      </Button>
    </form>
  );
};