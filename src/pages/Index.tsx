import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LogConsole } from "@/components/LogConsole";
import { useSettings } from "@/hooks/use-settings";
import { Seo } from "@/components/Seo";
import { NavLink } from "react-router-dom";
import { Input } from "@/components/ui/input";

// Extend Window interface to include electronAPI
declare global { interface Window { api: any } }

const Index = () => {
  const { settings } = useSettings();
  const [logs, setLogs] = useState<string[]>([]);
  const [isWorking, setIsWorking] = useState(false);
  const [targetUrl, setTargetUrl] = useState<string>('https://twitter.com/username');
  const isScraping = useMemo(() => Boolean(settings?.ingest?.scrape?.enabled), [settings]);

  const runOnce = async () => {
    if (!window.api) {
      setLogs((l) => [...l, 'Error: Electron API not available.']);
      return;
    }
    setIsWorking(true);
    setLogs((l) => [...l, `取得開始: ${targetUrl}`]);
    try {
      // ingest: configのscrape.enabled=falseならモックで動作
      const ingestResult = await window.api.ingestPost(targetUrl);
      if (!ingestResult?.success) {
        setLogs((l) => [...l, `取得失敗: ${ingestResult?.error || 'unknown'}`]);
        setIsWorking(false);
        return;
      }
      const postData = ingestResult.data;
      setLogs((l) => [...l, `取得OK: @${postData.author} / ${postData.text?.slice(0,60)}...`]);

      setLogs((l) => [...l, '合成開始 (ffmpeg)...']);
      const renderResult = await window.api.renderVideo({ postData, settings });
      if (renderResult?.success) {
        setLogs((l) => [...l, `合成完了: ${renderResult.outputPath}`]);
        if (settings?.general?.outputPath) {
          window.api.openPathInExplorer?.(settings.general.outputPath);
        }
      } else {
        setLogs((l) => [...l, `合成失敗: ${renderResult?.error || 'unknown'}`]);
      }
    } catch (e: any) {
      setLogs((l) => [...l, `エラー: ${e.message}`]);
    } finally {
      setIsWorking(false);
    }
  };

  useEffect(() => {
    window.api?.on?.('render:progress', (_: any, data: string) => {
      setLogs((l) => [...l, `ffmpeg> ${data.trim()}`]);
    });
  }, []);

  const clearLogs = () => setLogs([]);

  return (
    <div className="container mx-auto p-6 space-y-8">
      <Seo title="アダアフィ用ショート動画支援アプリ（仮） | ダッシュボード" description="Xを監視して自動でショート動画化するツールのダッシュボード" canonical="/" />

      <section className="grid gap-6 xl:grid-cols-3 items-start">
        <Card className="border bg-card/60 backdrop-blur xl:col-span-2">
          <CardContent className="p-6 space-y-4">
            <h1 className="text-2xl md:text-3xl font-bold">アダアフィ用ショート動画支援アプリ（仮）</h1>
            <p className="text-muted-foreground">設定したXアカウントのRTを監視し、自動でショート動画化して保存します。</p>
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 pt-2">
              <div className="flex-1 min-w-[240px]">
                <Input value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} placeholder="XのURL (アカウント or ポスト)" />
              </div>
              <Button variant="hero" size="xl" onClick={runOnce} className="w-full sm:w-auto" disabled={isWorking}>
                {isWorking ? "処理中..." : "取得→合成 実行"}
              </Button>
              <NavLink to="/settings" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full sm:w-auto" disabled={isScraping}>設定を開く</Button>
              </NavLink>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 text-sm">
              <div>
                <div className="text-muted-foreground">出力先</div>
                <div className="font-medium">{settings?.general?.outputPath}</div>
              </div>
              <div>
                <div className="text-muted-foreground">背景動画</div>
                <div className="font-medium">{settings?.render?.backgroundVideoPath}</div>
              </div>
              <div>
                <div className="text-muted-foreground">背景ループ</div>
                <div className="font-medium">{settings?.render?.loopBackground ? '有効' : '無効'}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border bg-card/60 backdrop-blur xl:col-span-2">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-2xl md:text-3xl font-bold">ショート動画転載変換</h2>
            <p className="text-muted-foreground">設定したショート動画アカウントの内容を監視し、自動で転載できる形式にして保存します。</p>
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 pt-2">
              <Button variant="hero" size="xl" onClick={runOnce} className="w-full sm:w-auto" disabled={isWorking}>取得→合成 実行</Button>
              <NavLink to="/settings" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full sm:w-auto" disabled={isScraping}>設定を開く</Button>
              </NavLink>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 text-sm">
              <div>
                <div className="text-muted-foreground">出力先</div>
                <div className="font-medium">{settings?.general?.outputPath}</div>
              </div>
              <div>
                <div className="text-muted-foreground">品質プリセット</div>
                <div className="font-medium">{settings?.render?.qualityPreset}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3 xl:col-span-1">
          <LogConsole logs={logs} onClear={clearLogs} className="min-h-[30vh] h-[40vh] md:h-[50vh] xl:h-[60vh]" />
          <p className="text-xs text-muted-foreground">注: スクレイピングは設定でONにした場合のみ実行（既定はモックでネットワーク不要）。</p>
        </div>
      </section>
    </div>
  );
};

export default Index;
