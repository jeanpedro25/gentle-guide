import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

type ProfileRow = {
  display_name: string | null;
  avatar_url: string | null;
  created_at: string | null;
};

const ProfilePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileRow | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setProfile(null);
      return;
    }

    let active = true;

    const loadProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, created_at")
        .eq("id", user.id)
        .maybeSingle();

      if (active) setProfile(data ?? null);
    };

    loadProfile();

    return () => {
      active = false;
    };
  }, [user?.id]);

  const displayName = useMemo(() => {
    const fallbackName =
      (user?.user_metadata as Record<string, unknown> | undefined)?.name ??
      (user?.user_metadata as Record<string, unknown> | undefined)?.full_name;
    return profile?.display_name ?? (typeof fallbackName === "string" ? fallbackName : null);
  }, [profile?.display_name, user?.user_metadata]);

  const planLabel = useMemo(() => {
    const metadata = user?.user_metadata as Record<string, unknown> | undefined;
    const appMetadata = user?.app_metadata as Record<string, unknown> | undefined;
    const plan =
      metadata?.plan ??
      metadata?.plan_name ??
      metadata?.subscription ??
      appMetadata?.plan ??
      appMetadata?.subscription;
    return typeof plan === "string" && plan.trim().length > 0 ? plan : "Gratuito";
  }, [user?.user_metadata, user?.app_metadata]);

  const createdAtLabel = useMemo(() => {
    const raw = profile?.created_at ?? (user as { created_at?: string } | null)?.created_at;
    if (!raw) return "—";
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }, [profile?.created_at, user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/welcome");
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <h1 className="text-2xl font-bold text-foreground mb-6">Perfil</h1>
      <div className="grid gap-4">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-card-foreground">
              <User className="w-5 h-5" />
              Minha Conta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={profile?.avatar_url ?? undefined} alt={displayName ?? user?.email ?? "Perfil"} />
                <AvatarFallback>
                  {(displayName ?? user?.email ?? "?").toString().slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">Nome</p>
                <p className="text-foreground truncate">{displayName ?? "—"}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="text-foreground break-all">{user?.email ?? "—"}</p>
            </div>
            <Button variant="destructive" onClick={handleLogout} className="w-full">
              <LogOut className="w-4 h-4 mr-2" /> Sair
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-card-foreground">Dados da Conta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">ID do usuário</p>
              <p className="text-foreground break-all">{user?.id ?? "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Criado em</p>
              <p className="text-foreground">{createdAtLabel}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-card-foreground">Plano Assinado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground">{planLabel}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfilePage;
