import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ProfilePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/welcome");
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <h1 className="text-2xl font-bold text-foreground mb-6">Perfil</h1>
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-card-foreground">
            <User className="w-5 h-5" />
            Minha Conta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="text-foreground">{user?.email ?? "—"}</p>
          </div>
          <Button variant="destructive" onClick={handleLogout} className="w-full">
            <LogOut className="w-4 h-4 mr-2" /> Sair
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfilePage;
