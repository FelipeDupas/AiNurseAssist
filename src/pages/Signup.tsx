import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Stethoscope } from "lucide-react";
import { Link } from "react-router-dom";

const Signup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nome: "",
    crm: "",
    email: "",
    password: "",
    confirmPassword: ""
  });

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      alert("As senhas não coincidem!");
      return;
    }

    try {
      // Fazendo a chamada real para o Python
      const response = await fetch("http://127.0.0.1:8000/users/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          full_name: formData.nome, // O Python espera 'full_name'
          crm: formData.crm
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Usuário criado:", data);
        alert("Cadastro realizado com sucesso!");
        navigate("/login"); // Manda pro login
      } else {
        const errorData = await response.json();
        alert("Erro ao cadastrar: " + (errorData.detail || "Erro desconhecido"));
      }
    } catch (error) {
      console.error("Erro de conexão:", error);
      alert("Erro ao conectar com o servidor. Verifique se o backend está rodando.");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value
    });
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
            Cadastro de Profissional - Sistema de Teletriagem
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome Completo</Label>
              <Input
                id="nome"
                type="text"
                placeholder="Dr. João Silva"
                value={formData.nome}
                onChange={handleChange}
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="crm">CRM</Label>
              <Input
                id="crm"
                type="text"
                placeholder="123456"
                value={formData.crm}
                onChange={handleChange}
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Profissional</Label>
              <Input
                id="email"
                type="email"
                placeholder="medico@exemplo.com.br"
                value={formData.email}
                onChange={handleChange}
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
                value={formData.password}
                onChange={handleChange}
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                className="h-11"
              />
            </div>
            <Button type="submit" className="w-full h-11 text-base font-semibold">
              Cadastrar
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              Já tem uma conta?{" "}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Fazer login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Signup;