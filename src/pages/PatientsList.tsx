import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, User, Search, Plus, Calendar } from "lucide-react";

const PatientsList = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const medico = JSON.parse(localStorage.getItem("medico") || "{}");

  useEffect(() => {
    fetch(`http://127.0.0.1:8000/patients/?owner_id=${medico.id}`)
      .then(res => res.json())
      .then(data => setPatients(data))
      .catch(err => console.error("Erro ao buscar pacientes:", err));
  }, [medico.id]);

  const filteredPatients = patients.filter(p => 
    p.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-card px-6 py-4 flex justify-between items-center">
        <Button variant="ghost" onClick={() => navigate("/dashboard")} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>
        <h1 className="text-xl font-bold text-primary">Gestão de Pacientes</h1>
        <Button onClick={() => navigate("/add-case")} className="gap-2">
          <Plus className="w-4 h-4" /> Novo Paciente
        </Button>
      </header>

      <main className="container mx-auto p-6">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar paciente pelo nome..." 
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPatients.map((patient) => (
            <Card key={patient.id} className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-secondary">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="w-5 h-5 text-secondary" />
                  {patient.full_name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Nasc: {patient.birth_date} {/* Antes era birthDate */}
                  </p>
                  <p>Sexo: {patient.gender}</p>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full mt-4 text-xs"
                  onClick={() => navigate(`/add-case?patientId=${patient.id}`)}
                >
                  Nova Consulta (Retorno)
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default PatientsList;