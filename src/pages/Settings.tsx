import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { useFontSize } from "@/contexts/FontSizeContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Stethoscope, Save, User, Bell, Shield, Palette } from "lucide-react";
import { toast } from "sonner";

const Settings = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { fontSize, setFontSize } = useFontSize();
  
  // Pega o ID do médico logado
  const medicoLocal = JSON.parse(localStorage.getItem("medico") || "{}");
  const userId = medicoLocal?.id;

  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    nome: "",
    crm: "",
    email: "",
    especialidade: "Clínico Geral",
    telefone: ""
  });

  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    urgentCases: true,
    weeklyReport: false,
    aiUpdates: true
  });

  // Carregar dados reais do Banco de Dados
  useEffect(() => {
    if (!userId) {
      navigate("/login");
      return;
    }

    const fetchProfile = async () => {
      try {
        const response = await fetch(`http://127.0.0.1:8000/users/${userId}`);
        if (response.ok) {
          const data = await response.json();
          setProfileData({
            nome: data.full_name,
            crm: data.crm,
            email: data.email,
            especialidade: data.specialty || "Clínico Geral",
            telefone: data.phone || ""
          });
        }
      } catch (error) {
        console.error("Erro ao carregar perfil:", error);
        toast.error("Não foi possível carregar seus dados.");
      }
    };

    fetchProfile();
  }, [userId, navigate]);

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://127.0.0.1:8000/users/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: profileData.nome,
          crm: profileData.crm,
          email: profileData.email,
          phone: profileData.telefone,
          specialty: profileData.especialidade
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Atualiza o localStorage para manter a sessão sincronizada
        localStorage.setItem("medico", JSON.stringify({
          id: data.id,
          nome: data.full_name,
          crm: data.crm,
          email: data.email,
          specialty: data.specialty
        }));

        toast.success("Perfil atualizado com sucesso!");
      } else {
        toast.error("Erro ao atualizar perfil.");
      }
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro de conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotifications = () => {
    // Aqui você salvaria no banco também futuramente
    toast.success("Preferências de notificação salvas!");
  };

  const handleSaveAppearance = () => {
    toast.success("Preferências de aparência salvas!");
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
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Configurações</h1>
          <p className="text-muted-foreground">
            Gerencie suas preferências e informações do sistema
          </p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile" className="gap-2">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Perfil</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Notificações</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">Segurança</span>
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-2">
              <Palette className="w-4 h-4" />
              <span className="hidden sm:inline">Aparência</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card className="shadow-[var(--shadow-elevated)]">
              <CardHeader>
                <CardTitle>Informações do Perfil</CardTitle>
                <CardDescription>
                  Atualize suas informações profissionais
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome Completo</Label>
                    <Input
                      id="nome"
                      value={profileData.nome}
                      onChange={(e) => setProfileData({...profileData, nome: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="crm">CRM</Label>
                    <Input
                      id="crm"
                      value={profileData.crm}
                      onChange={(e) => setProfileData({...profileData, crm: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Profissional</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input
                      id="telefone"
                      placeholder="(00) 00000-0000"
                      value={profileData.telefone}
                      onChange={(e) => setProfileData({...profileData, telefone: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="especialidade">Especialidade</Label>
                  <Select 
                    value={profileData.especialidade}
                    onValueChange={(value) => setProfileData({...profileData, especialidade: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione sua especialidade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Clínico Geral">Clínico Geral</SelectItem>
                      <SelectItem value="Cardiologia">Cardiologia</SelectItem>
                      <SelectItem value="Neurologia">Neurologia</SelectItem>
                      <SelectItem value="Pediatria">Pediatria</SelectItem>
                      <SelectItem value="Ortopedia">Ortopedia</SelectItem>
                      <SelectItem value="Dermatologia">Dermatologia</SelectItem>
                      <SelectItem value="Enfermagem">Enfermagem</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="flex justify-end">
                  <Button onClick={handleSaveProfile} className="gap-2" disabled={loading}>
                    <Save className="w-4 h-4" />
                    {loading ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card className="shadow-[var(--shadow-elevated)]">
              <CardHeader>
                <CardTitle>Preferências de Notificação</CardTitle>
                <CardDescription>
                  Escolha como deseja receber notificações
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="emailAlerts">Alertas por Email</Label>
                    <p className="text-sm text-muted-foreground">
                      Receba notificações importantes por email
                    </p>
                  </div>
                  <Switch
                    id="emailAlerts"
                    checked={notifications.emailAlerts}
                    onCheckedChange={(checked) => 
                      setNotifications({...notifications, emailAlerts: checked})
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="urgentCases">Casos Urgentes</Label>
                    <p className="text-sm text-muted-foreground">
                      Notificação imediata para casos de alta urgência
                    </p>
                  </div>
                  <Switch
                    id="urgentCases"
                    checked={notifications.urgentCases}
                    onCheckedChange={(checked) => 
                      setNotifications({...notifications, urgentCases: checked})
                    }
                  />
                </div>

                <Separator />

                <div className="flex justify-end">
                  <Button onClick={handleSaveNotifications} className="gap-2">
                    <Save className="w-4 h-4" />
                    Salvar Preferências
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab (Placeholder - funcionalidades complexas) */}
          <TabsContent value="security">
            <Card className="shadow-[var(--shadow-elevated)]">
              <CardHeader>
                <CardTitle>Segurança</CardTitle>
                <CardDescription>
                  Gerencie a segurança da sua conta
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-muted/50 rounded-lg text-center text-muted-foreground">
                  <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  Funcionalidades de troca de senha e 2FA estarão disponíveis em breve.
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance">
            <Card className="shadow-[var(--shadow-elevated)]">
              <CardHeader>
                <CardTitle>Aparência</CardTitle>
                <CardDescription>
                  Personalize a aparência do sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="theme">Tema</Label>
                  <Select 
                    value={theme}
                    onValueChange={setTheme}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Claro</SelectItem>
                      <SelectItem value="dark">Escuro</SelectItem>
                      <SelectItem value="system">Sistema</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveAppearance} className="gap-2">
                    <Save className="w-4 h-4" />
                    Salvar Preferências
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Settings;