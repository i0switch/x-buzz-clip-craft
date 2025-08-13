import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Seo } from "@/components/Seo";

const Setup = () => {
  const { toast } = useToast();
  const [sessionCookie, setSessionCookie] = useState<string>(localStorage.getItem("xbuzz_x_cookie") || "");

  const handleSave = () => {
    localStorage.setItem("xbuzz_x_cookie", sessionCookie.trim());
    toast({ title: "保存しました", description: "X監視用のセッション/Cookieを保存しました。" });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Seo title="初期セットアップ | Xバズポストショート動画変換" description="X監視用アカウントのセッション/Cookieを保存" canonical="/setup" />
      <Card className="border bg-card/60 backdrop-blur">
        <CardHeader>
          <CardTitle>初期セットアップ（X監視用アカウント）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cookie">セッション/Cookie</Label>
            <Input
              id="cookie"
              placeholder="例: auth_token=...; ct0=...; other_cookie=..."
              value={sessionCookie}
              onChange={(e) => setSessionCookie(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Xにログイン済みブラウザからCookie文字列を貼り付けてください。セッション切れの際は再設定します。
            </p>
          </div>
          <div className="pt-2">
            <Button variant="hero" size="lg" onClick={handleSave}>保存する</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Setup;
