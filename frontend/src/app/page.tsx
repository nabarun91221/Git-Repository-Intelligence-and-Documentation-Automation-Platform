import { GithubLoginButton } from "@/components/github-login-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-5 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.16),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.12),_transparent_35%)]" />

      <Card className="relative w-full max-w-md border-border/70 bg-card/95 shadow-2xl shadow-slate-950/10 backdrop-blur">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <span className="font-mono text-xl font-bold">&lt;/&gt;</span>
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl tracking-tight">
              Welcome to CodeAtlas
            </CardTitle>
            <CardDescription className="text-base leading-6">
              Connect a GitHub account to turn your repositories into clear,
              useful documentation.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <GithubLoginButton />
        </CardContent>

        <CardFooter className="justify-center px-8 pb-8 text-center text-xs leading-5 text-muted-foreground">
          By continuing, you agree to let CodeAtlas access the GitHub profile
          information needed to identify your account.
        </CardFooter>
      </Card>
    </main>
  );
}
