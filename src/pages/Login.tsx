import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Stethoscope } from "lucide-react";
import { toast } from "sonner"; // Se você tiver o sonner instalado, ajuda muito

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    console.log("Tentando logar com:", email); // Debug no console do navegador

    try {
      // AQUI ESTÁ A MÁGICA: Ele vai bater no seu Python
      const response = await fetch("http://127.0.0.1:8000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      console.log("Resposta do servidor:", response.status); // Debug

      if (response.ok) {
        const data = await response.json();
        
        // Só salva e entra SE o Python disse OK
        localStorage.setItem("medico", JSON.stringify({ 
          id: data.id,
          nome: data.full_name, 
          crm: data.crm,
          email: data.email,
          specialty: data.specialty
        }));
        
        navigate("/dashboard");
      } else {
        // Se a senha estiver errada, cai aqui
        const errorData = await response.json();
        alert("Erro: " + (errorData.detail || "Senha incorreta"));
      }
    } catch (error) {
      console.error("Erro:", error);
      alert("Erro: O servidor Python está desligado?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Card className="w-full max-w-md shadow-[var(--shadow-elevated)]">
        <CardHeader className="space-y-3 text-center pb-8">
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
            <Stethoscope className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-3xl font-bold">AI Nurse Assist</CardTitle>
          <CardDescription className="text-base">
            Acesso Profissional - Sistema de Teletriagem
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email Profissional</Label>
              <Input
                id="email"
                type="email"
                placeholder="medico@exemplo.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11"
              />
            </div>
            <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={loading}>
              {loading ? "Verificando..." : "Entrar"}
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              Não tem uma conta?{" "}
              <Link to="/signup" className="text-primary hover:underline font-medium">
                Cadastre-se
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;