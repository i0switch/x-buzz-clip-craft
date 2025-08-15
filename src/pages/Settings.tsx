
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useSettings } from "@/hooks/use-settings";
import { Seo } from "@/components/Seo";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Settings = () => {
  const { settings, isLoading, isError, error, updateSettings, isUpdating } = useSettings();

  const handleSelectDirectory = async (key: 'outputPath' | 'backgroundVideoPath') => {
    const result = key === 'outputPath'
      ? await window.api.openDirectoryDialog()
      : await window.api.openFileDialog(); // 仮。動画ファイル選択ダイアログを後で実装

    if (result && settings) {
      if (key === 'outputPath') {
        updateSettings({ general: { ...settings.general, outputPath: result } });
      } else {
        updateSettings({ render: { ...settings.render, backgroundVideoPath: result } });
      }
      toast({ title: "パスが更新されました", description: result });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-1/4" />
          <Skeleton className="h-5 w-1/2" />
        </div>
        <Card>
          <CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError) {
    return <div>Error loading settings: {error?.message}</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <Seo title="設定" description="アプリケーションの各種設定を行います。" />

      <div className="space-y-2">
        <h1 className="text-2xl font-bold">設定</h1>
        <p className="text-muted-foreground">
          アプリケーションの各種設定を行います。変更は自動的に保存されます。
          {isUpdating && <span className="ml-2 animate-pulse">保存中...</span>}
        </p>
      </div>

      {/* --- General Settings --- */}
      <Card>
        <CardHeader>
          <CardTitle>一般設定</CardTitle>
          <CardDescription>基本的なアプリケーション設定です。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="outputPath">出力先ディレクトリ</Label>
            <div className="flex gap-2">
              <Input
                id="outputPath"
                value={settings?.general.outputPath || ''}
                readOnly
              />
              <Button variant="outline" onClick={() => handleSelectDirectory('outputPath')}>
                選択
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="watchUrl">監視URL（スケジューラ）</Label>
            <Input
              id="watchUrl"
              value={settings?.general.watchUrl || ''}
              onChange={(e) => settings && updateSettings({ general: { ...settings.general, watchUrl: e.target.value } })}
              placeholder="https://twitter.com/username"
            />
          </div>
        </CardContent>
      </Card>

      {/* --- Ingest Settings --- */}
      <Card>
        <CardHeader>
          <CardTitle>取得設定</CardTitle>
          <CardDescription>X(Twitter)からのデータ取得方法を設定します。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
            <div className="space-y-0.5">
              <Label>スクレイピングを有効にする</Label>
              <p className="text-xs text-muted-foreground">
                有効にすると、実際にXにアクセスしてデータを取得します。利用規約にご注意ください。
              </p>
            </div>
            <Switch
              checked={settings?.ingest.scrape.enabled}
              onCheckedChange={(checked) =>
                settings && updateSettings({ ingest: { ...settings.ingest, scrape: { ...settings.ingest.scrape, enabled: checked } } })
              }
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
            <div className="space-y-0.5">
              <Label>自動化スケジューラ</Label>
              <p className="text-xs text-muted-foreground">ONにすると一定間隔で取得→合成を自動実行します。</p>
            </div>
            <Switch
              checked={settings?.scheduler.enabled}
              onCheckedChange={(checked) =>
                settings && updateSettings({ scheduler: { ...settings.scheduler, enabled: checked } })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="interval">実行間隔（分）</Label>
            <Input
              id="interval"
              type="number"
              min={1}
              value={settings?.scheduler.intervalMinutes ?? 60}
              onChange={(e) => settings && updateSettings({ scheduler: { ...settings.scheduler, intervalMinutes: Number(e.target.value) || 1 } })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cookie">X 認証クッキー</Label>
            <textarea
              id="cookie"
              className="w-full min-h-32 rounded-md border bg-background px-3 py-2 text-sm"
              value={settings?.ingest.scrape.cookie || ''}
              onChange={(e) =>
                settings && updateSettings({ ingest: { ...settings.ingest, scrape: { ...settings.ingest.scrape, cookie: e.target.value } } })
              }
              placeholder="ここにCookieを貼り付けます..."
              disabled={!settings?.ingest.scrape.enabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* --- Render Settings --- */}
      <Card>
        <CardHeader>
          <CardTitle>動画合成設定</CardTitle>
          <CardDescription>生成される動画の見た目や品質を設定します。</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label>品質プリセット</Label>
            <Select
              value={settings?.render.qualityPreset}
              onValueChange={(value: 'low' | 'standard' | 'high') => 
                settings && updateSettings({ render: { ...settings.render, qualityPreset: value } })
              }
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">低品質 (高速)</SelectItem>
                <SelectItem value="standard">標準品質</SelectItem>
                <SelectItem value="high">高品質 (低速)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>オーバーレイ位置</Label>
            <Select
              value={settings?.render.overlayPosition}
              onValueChange={(value: 'center' | 'top-center' | 'bottom-center' | 'custom') => 
                settings && updateSettings({ render: { ...settings.render, overlayPosition: value } })
              }
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="center">中央</SelectItem>
                <SelectItem value="top-center">上部中央</SelectItem>
                <SelectItem value="bottom-center">下部中央</SelectItem>
                <SelectItem value="custom" disabled>カスタム (未実装)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="backgroundVideoPath">背景動画のパス</Label>
            <div className="flex gap-2">
              <Input
                id="backgroundVideoPath"
                value={settings?.render.backgroundVideoPath || ''}
                onChange={(e) => 
                  settings && updateSettings({ render: { ...settings.render, backgroundVideoPath: e.target.value } })
                }
              />
              <Button variant="outline" onClick={() => handleSelectDirectory('backgroundVideoPath')}>
                選択
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
};

export default Settings;
