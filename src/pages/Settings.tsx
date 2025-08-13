
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { useSettings } from "@/hooks/use-settings";
import { Seo } from "@/components/Seo";

const Settings = () => {
  const { settings, update, updateOutput } = useSettings();
  const { toast } = useToast();
  const [accountsText, setAccountsText] = useState(settings.accounts.join("\n"));

  const handleSave = () => {
    const accounts = accountsText
      .split(/\n|,/) // 改行・カンマ区切り
      .map((s) => s.trim())
      .filter(Boolean);
    update({ accounts });
    toast({ title: "保存しました", description: "設定が保存されました。" });
  };

  const [width, height] = useMemo(() => settings.output.resolution.split("x").map(Number), [settings.output.resolution]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Seo title="設定 | Xバズポストショート動画変換" description="監視対象や動画の出力設定" canonical="/settings" />
      
      <Card className="border bg-card/60 backdrop-blur">
        <CardHeader>
          <CardTitle>X監視アカウント設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>監視対象Xアカウント（複数可・改行/カンマ区切り）</Label>
            <textarea
              className="w-full min-h-40 rounded-md border bg-background px-3 py-2 text-sm"
              value={accountsText}
              onChange={(e) => setAccountsText(e.target.value)}
              placeholder="例：@username1
@username2
@username3"
            />
            <p className="text-sm text-muted-foreground">
              @マークありなしどちらでも可能。改行またはカンマで区切って複数アカウントを指定できます。
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="interval">監視間隔（分）</Label>
              <Input
                id="interval"
                type="number"
                min={1}
                value={settings.intervalMinutes}
                onChange={(e) => update({ intervalMinutes: Number(e.target.value) || 1 })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border bg-card/60 backdrop-blur">
        <CardHeader>
          <CardTitle>動画出力設定</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label>解像度（WxH）</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                min={256}
                value={width}
                onChange={(e) => {
                  const w = Number(e.target.value) || 1080;
                  updateOutput({ resolution: `${w}x${height}` });
                }}
              />
              <Input
                type="number"
                min={256}
                value={height}
                onChange={(e) => {
                  const h = Number(e.target.value) || 1920;
                  updateOutput({ resolution: `${width}x${h}` });
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>アスペクト比</Label>
            <Select value={settings.output.aspect} onValueChange={(v) => updateOutput({ aspect: v as any })}>
              <SelectTrigger>
                <SelectValue placeholder="選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="9:16">9:16（縦）</SelectItem>
                <SelectItem value="16:9">16:9（横）</SelectItem>
                <SelectItem value="1:1">1:1（正方形）</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="length">動画の長さ（秒）</Label>
            <Input
              id="length"
              type="number"
              min={3}
              value={settings.output.lengthSec}
              onChange={(e) => updateOutput({ lengthSec: Number(e.target.value) || 15 })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bgm">BGMのパス（任意）</Label>
            <Input
              id="bgm"
              placeholder="例: C:\\videos\\bgm.mp3"
              value={settings.output.bgmPath || ""}
              onChange={(e) => updateOutput({ bgmPath: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bgvid">背景動画のパス（任意）</Label>
            <Input
              id="bgvid"
              placeholder="例: C:\\videos\\background.mp4"
              value={settings.output.backgroundVideoPath || ""}
              onChange={(e) => updateOutput({ backgroundVideoPath: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>スクショの位置</Label>
            <Select value={settings.output.screenshotPosition} onValueChange={(v) => updateOutput({ screenshotPosition: v as any })}>
              <SelectTrigger>
                <SelectValue placeholder="選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="top">上</SelectItem>
                <SelectItem value="center">中央</SelectItem>
                <SelectItem value="bottom">下</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>テロップの位置</Label>
            <Select value={settings.output.telopPosition} onValueChange={(v) => updateOutput({ telopPosition: v as any })}>
              <SelectTrigger>
                <SelectValue placeholder="選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="top">上</SelectItem>
                <SelectItem value="bottom">下</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button variant="hero" size="lg" onClick={handleSave}>設定を保存</Button>
      </div>
    </div>
  );
};

export default Settings;
