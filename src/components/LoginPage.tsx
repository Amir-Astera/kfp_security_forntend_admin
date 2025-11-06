import { useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Shield, User, Building2 } from "lucide-react";
import { toast } from "sonner@2.0.3";

interface LoginPageProps {
  onLogin: (role: "superadmin" | "agency", userName: string) => void;
}

// Моковые пользователи (не отображаются в UI)
const MOCK_USERS = {
  superadmin: {
    email: "admin@kfp.kz",
    password: "admin123",
    name: "Суперадминистратор",
  },
  agency: {
    email: "agency@kzsecurity.kz",
    password: "agency123",
    name: "ТОО «Казахстан Секьюрити»",
  },
};

export function LoginPage({ onLogin }: LoginPageProps) {
  const [selectedRole, setSelectedRole] = useState<"superadmin" | "agency" | null>(
    null
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRoleSelect = (role: "superadmin" | "agency") => {
    setSelectedRole(role);
    setEmail("");
    setPassword("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedRole) {
      toast.error("Выберите роль для входа");
      return;
    }

    setLoading(true);

    // Имитация задержки запроса
    await new Promise((resolve) => setTimeout(resolve, 800));

    const mockUser = MOCK_USERS[selectedRole];

    if (email === mockUser.email && password === mockUser.password) {
      toast.success("Вход выполнен успешно");
      onLogin(selectedRole, mockUser.name);
    } else {
      toast.error("Неверный email или пароль");
    }

    setLoading(false);
  };

  const handleBack = () => {
    setSelectedRole(null);
    setEmail("");
    setPassword("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Shield className="w-10 h-10 text-primary" />
            <h1 className="text-4xl text-foreground">KFP Security</h1>
          </div>
          <p className="text-muted-foreground">
            Система управления охраной агрохолдинга
          </p>
        </div>

        {!selectedRole ? (
          /* Role Selection */
          <div className="grid md:grid-cols-2 gap-6">
            {/* Superadmin Card */}
            <Card
              className="p-8 cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary"
              onClick={() => handleRoleSelect("superadmin")}
            >
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10">
                  <User className="w-10 h-10 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl text-foreground mb-2">
                    Суперадминистратор
                  </h2>
                  <p className="text-muted-foreground">
                    Полный доступ к управлению системой, филиалами, агентствами и
                    охранниками
                  </p>
                </div>
                <Button size="lg" className="w-full">
                  Войти как администратор
                </Button>
              </div>
            </Card>

            {/* Agency Card */}
            <Card
              className="p-8 cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary"
              onClick={() => handleRoleSelect("agency")}
            >
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-info/10">
                  <Building2 className="w-10 h-10 text-info" />
                </div>
                <div>
                  <h2 className="text-2xl text-foreground mb-2">
                    Охранное агентство
                  </h2>
                  <p className="text-muted-foreground">
                    Управление охранниками вашего агентства, просмотр визитов и
                    расписания смен
                  </p>
                </div>
                <Button size="lg" variant="outline" className="w-full">
                  Войти как агентство
                </Button>
              </div>
            </Card>
          </div>
        ) : (
          /* Login Form */
          <Card className="max-w-md mx-auto p-8">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                {selectedRole === "superadmin" ? (
                  <User className="w-8 h-8 text-primary" />
                ) : (
                  <Building2 className="w-8 h-8 text-info" />
                )}
              </div>
              <h2 className="text-2xl text-foreground mb-2">
                {selectedRole === "superadmin"
                  ? "Вход суперадминистратора"
                  : "Вход охранного агентства"}
              </h2>
              <p className="text-muted-foreground">
                Введите ваши учетные данные для входа
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="example@kfp.kz"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Пароль</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-3 pt-2">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Вход..." : "Войти"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleBack}
                  disabled={loading}
                >
                  Назад к выбору роли
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>© 2025 KFP Security. Все права защищены.</p>
        </div>
      </div>
    </div>
  );
}
