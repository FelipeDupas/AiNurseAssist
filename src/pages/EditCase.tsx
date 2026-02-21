import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CaseForm } from "@/components/CaseForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";

const EditCase = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`http://127.0.0.1:8000/cases/${id}`)
      .then(res => res.json())
      .then(data => { setCaseData(data); setLoading(false); });
  }, [id]);

  const handleUpdate = async (formData: any) => {
    setSaving(true);
    const medico = JSON.parse(localStorage.getItem("medico") || "{}");
    
    // Enviamos o PUT para atualizar o registro
    const response = await fetch(`http://127.0.0.1:8000/cases/${id}?owner_id=${medico.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (response.ok) navigate(`/case/${id}`);
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="container mx-auto px-6 py-8">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 gap-2">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </Button>
      <Card className="max-w-2xl mx-auto shadow-lg border-t-4 border-t-primary">
        <CardHeader><CardTitle>Editar Prontuário</CardTitle></CardHeader>
        <CardContent>
          <CaseForm initialData={caseData} onSubmit={handleUpdate} isLoading={saving} />
        </CardContent>
      </Card>
    </div>
  );
};

export default EditCase;