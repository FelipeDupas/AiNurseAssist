import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, User, Shield, Bell, Palette } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Settings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  // Recupera o ID do médico salvo no login
  const localData = localStorage.getItem("medico");
  const medicoId = localData ? JSON.parse(localData).id : null;

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    crm: "",
    phone: "",
    specialty: "Clínico Geral"
  });

  // Busca os dados atualizados do Backend ao abrir a tela
  useEffect(() => {
    if (!medicoId) {
      navigate("/login");
      return;
    }

    const fetchUserData = async () => {
      try {
        const response = await fetch(`http://127.0.0.1:8000/users/${medicoId}`);
        if (response.ok) {
          const data = await response.json();
          // Preenche o formulário com os dados que vieram do banco (Snake Case do Python)
          setFormData({
            full_name: data.full_name || "",
            email: data.email || "",
            crm: data.crm || "",
            phone: data.phone || "",
            specialty: data.specialty || "Clínico Geral"
          });
        }
      } catch (error) {
        console.error("Erro ao buscar dados do usuário", error);
        toast.error("Erro ao carregar perfil.");
      }
    };

    fetchUserData();
  }, [medicoId, navigate]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`http://127.0.0.1:8000/users/${medicoId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const updatedUser = await response.json();
        
        // Atualiza o localStorage para refletir o novo nome no Dashboard imediatamente
        localStorage.setItem("medico", JSON.stringify(updatedUser));
        
        toast.success("Perfil atualizado com sucesso!");
      } else {
        toast.error("Erro ao atualizar perfil.");
      }
    } catch (error) {
      toast.error("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-card px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
        <Button variant="ghost" onClick={() => navigate("/dashboard")} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Voltar ao Dashboard
        </Button>
        <h1 className="text-xl font-bold">Configurações</h1>
      </header>

      <main className="container mx-auto p-6 max-w-4xl">
        <Tabs defaultValue="perfil" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="perfil" className="gap-2"><User className="w-4 h-4"/> Perfil</TabsTrigger>
            <TabsTrigger value="notificacoes" className="gap-2"><Bell className="w-4 h-4"/> Notificações</TabsTrigger>
            <TabsTrigger value="seguranca" className="gap-2"><Shield className="w-4 h-4"/> Segurança</TabsTrigger>
            <TabsTrigger value="aparencia" className="gap-2"><Palette className="w-4 h-4"/> Aparência</TabsTrigger>
          </TabsList>

          <TabsContent value="perfil">
            <form onSubmit={handleSave}>
              <Card>
                <CardHeader>
                  <CardTitle>Informações do Perfil</CardTitle>
                  <CardDescription>Atualize suas informações profissionais</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Nome Completo</Label>
                      <Input 
                        id="full_name" 
                        value={formData.full_name} 
                        onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="crm">CRM</Label>
                      <Input 
                        id="crm" 
                        value={formData.crm} 
                        onChange={(e) => setFormData({...formData, crm: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Profissional</Label>
                      <Input 
                        id="email" 
                        type="email"
                        value={formData.email} 
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefone</Label>
                      <Input 
                        id="phone" 
                        placeholder="(00) 00000-0000"
                        value={formData.phone} 
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="specialty">Especialidade</Label>
                    <Select 
                      value={formData.specialty} 
                      onValueChange={(v) => setFormData({...formData, specialty: v})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione sua especialidade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Clínico Geral">Clínico Geral</SelectItem>
                        <SelectItem value="Cardiologia">Cardiologia</SelectItem>
                        <SelectItem value="Pediatria">Pediatria</SelectItem>
                        <SelectItem value="Ortopedia">Ortopedia</SelectItem>
                        <SelectItem value="Dermatologia">Dermatologia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
                <div className="p-6 border-t flex justify-end">
                  <Button type="submit" disabled={loading} className="gap-2">
                    <Save className="w-4 h-4" />
                    {loading ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                </div>
              </Card>
            </form>
          </TabsContent>

          <TabsContent value="notificacoes">
            <Card>
              <CardHeader>
                <CardTitle>Preferências de Notificação</CardTitle>
                <CardDescription>Em breve você poderá configurar alertas.</CardDescription>
              </CardHeader>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Settings;