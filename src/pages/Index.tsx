import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LogConsole } from "@/components/LogConsole";
import { useSettings } from "@/hooks/use-settings";
import { Seo } from "@/components/Seo";
import { NavLink } from "react-router-dom";

const Index = () => {
  const { settings } = useSettings();
  const [logs, setLogs] = useState<string[]>([]);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, []);

  const accountsText = settings.accounts.length > 0 ? settings.accounts.join(", ") : "未設定";

  const startMonitor = () => {
    // ダミーのログ生成
    setLogs((l) => [...l, `監視開始: 間隔 ${settings.intervalMinutes}分、対象 ${accountsText}`]);
    let count = 0;
    if (timer.current) window.clearInterval(timer.current);
    timer.current = window.setInterval(() => {
      count++;
      setLogs((l) => [
        ...l,
        `チェック #${count}: Xを監視中…` ,
        count % 3 === 0 ? "新規RTポストを検出。スクショ→合成→ショート化（擬似）" : "更新なし"
      ]);
      if (count >= 5 && timer.current) {
        window.clearInterval(timer.current);
        setLogs((l) => [...l, "完了: デモ監視セッション終了"]);
      }
    }, 1200);
  };

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
              <Button variant="hero" size="xl" onClick={startMonitor} className="w-full sm:w-auto">監視を開始</Button>
              <NavLink to="/settings" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">設定を開く</Button>
              </NavLink>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 text-sm">
              <div>
                <div className="text-muted-foreground">監視対象</div>
                <div className="font-medium">{accountsText}</div>
              </div>
              <div>
                <div className="text-muted-foreground">監視間隔</div>
                <div className="font-medium">{settings.intervalMinutes} 分</div>
              </div>
              <div>
                <div className="text-muted-foreground">出力比率</div>
                <div className="font-medium">{settings.output.aspect} / {settings.output.resolution}</div>
              </div>
              <div>
                <div className="text-muted-foreground">長さ</div>
                <div className="font-medium">{settings.output.lengthSec} 秒</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border bg-card/60 backdrop-blur xl:col-span-2">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-2xl md:text-3xl font-bold">ショート動画転載変換</h2>
            <p className="text-muted-foreground">設定したショート動画アカウントの内容を監視し、自動で転載できる形式にして保存します。</p>
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 pt-2">
              <Button variant="hero" size="xl" onClick={startMonitor} className="w-full sm:w-auto">監視を開始</Button>
              <NavLink to="/settings" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">設定を開く</Button>
              </NavLink>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 text-sm">
              <div>
                <div className="text-muted-foreground">監視対象</div>
                <div className="font-medium">{accountsText}</div>
              </div>
              <div>
                <div className="text-muted-foreground">監視間隔</div>
                <div className="font-medium">{settings.intervalMinutes} 分</div>
              </div>
              <div>
                <div className="text-muted-foreground">出力比率</div>
                <div className="font-medium">{settings.output.aspect} / {settings.output.resolution}</div>
              </div>
              <div>
                <div className="text-muted-foreground">長さ</div>
                <div className="font-medium">{settings.output.lengthSec} 秒</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3 xl:col-span-1">
          <LogConsole logs={logs} onClear={clearLogs} className="min-h-[30vh] h-[40vh] md:h-[50vh] xl:h-[60vh]" />
        </div>
      </section>
    </div>
  );
};

export default Index;
