
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { useSettings } from "@/hooks/use-settings";
import { Seo } from "@/components/Seo";
import { Link } from "react-router-dom";
const Settings = () => {
  const { settings, update, updateOutput } = useSettings();
  const { toast } = useToast();
  const loggedIn = Boolean(localStorage.getItem("xbuzz_x_cookie"));
  const [accountsText, setAccountsText] = useState(settings.accounts.join("\n"));
  const [tiktokText, setTiktokText] = useState((settings.shortSites?.tiktokAccounts || []).join("\n"));
  const [instagramText, setInstagramText] = useState((settings.shortSites?.instagramAccounts || []).join("\n"));
  const [youtubeText, setYoutubeText] = useState((settings.shortSites?.youtubeAccounts || []).join("\n"));

  const handleSave = () => {
    const parseList = (text: string) =>
      text
        .split(/\n|,/) // 改行・カンマ区切り
        .map((s) => s.trim())
        .filter(Boolean);

    const accounts = parseList(accountsText);
    const tiktok = parseList(tiktokText);
    const instagram = parseList(instagramText);
    const youtube = parseList(youtubeText);

    update({
      accounts,
      shortSites: {
        ...(settings.shortSites || { tiktokAccounts: [], instagramAccounts: [], youtubeAccounts: [], intervalMinutes: 10 }),
        tiktokAccounts: tiktok,
        instagramAccounts: instagram,
        youtubeAccounts: youtube,
      },
    });
    toast({ title: "保存しました", description: "設定が保存されました。" });
  };

  const [width, height] = useMemo(() => settings.output.resolution.split("x").map(Number), [settings.output.resolution]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Seo title="設定 | Xバズポストショート動画変換" description="監視対象や動画の出力設定" canonical="/settings" />
      
      <Card className="border bg-card/60 backdrop-blur">
        <CardHeader>
          <CardTitle>監視用Xアカウント設定</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">ログイン状況</span>
              {loggedIn ? <Badge variant="default">ログイン済み</Badge> : <Badge variant="secondary">未ログイン</Badge>}
            </div>
            <p className="text-xs text-muted-foreground">
              Cookieの保存状態で判定しています。セッションが切れた場合は再ログインしてください。
            </p>
          </div>
          <Button asChild variant="hero" size="lg">
            <Link to="/setup">ログイン</Link>
          </Button>
        </CardContent>
      </Card>
      <div className="grid gap-6 md:grid-cols-2">
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
            <CardTitle>ショート動画サイト監視アカウント設定</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label>TikTok（複数可・改行/カンマ区切り）</Label>
                <textarea
                  className="w-full min-h-32 rounded-md border bg-background px-3 py-2 text-sm"
                  value={tiktokText}
                  onChange={(e) => setTiktokText(e.target.value)}
                  placeholder="例：@tiktok_user1&#10;@tiktok_user2"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Instagram（複数可・改行/カンマ区切り）</Label>
                <textarea
                  className="w-full min-h-32 rounded-md border bg-background px-3 py-2 text-sm"
                  value={instagramText}
                  onChange={(e) => setInstagramText(e.target.value)}
                  placeholder="例：@insta_user1&#10;@insta_user2"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>YouTube（複数可・改行/カンマ区切り）</Label>
                <textarea
                  className="w-full min-h-32 rounded-md border bg-background px-3 py-2 text-sm"
                  value={youtubeText}
                  onChange={(e) => setYoutubeText(e.target.value)}
                  placeholder="例：@channel1&#10;@channel2"
                />
              </div>

              <div className="space-y-2 max-w-xs">
                <Label htmlFor="short-interval">監視間隔（分）</Label>
                <Input
                  id="short-interval"
                  type="number"
                  min={1}
                  value={settings.shortSites.intervalMinutes}
                  onChange={(e) =>
                    update({
                      shortSites: {
                        ...settings.shortSites,
                        intervalMinutes: Number(e.target.value) || 1,
                      },
                    })
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
            <Label htmlFor="telopTop">テロップ（上部）任意</Label>
            <Input
              id="telopTop"
              placeholder="例: 最新のトレンド速報"
              value={settings.output.telopTopText || ""}
              onChange={(e) => updateOutput({ telopTopText: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="telopBottom">テロップ（下部）任意</Label>
            <Input
              id="telopBottom"
              placeholder="例: チャンネル登録・高評価お願いします"
              value={settings.output.telopBottomText || ""}
              onChange={(e) => updateOutput({ telopBottomText: e.target.value })}
            />
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
