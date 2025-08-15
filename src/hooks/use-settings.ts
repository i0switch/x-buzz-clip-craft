
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// このパスは、src/hooks -> src -> x-buzz-clip-craft -> core となるため、
// ../../core/settings.ts が正しい階層になる
import type { AppSettings } from '../../core/settings';

const SETTINGS_QUERY_KEY = ['settings'];

/**
 * アプリケーション設定を管理するためのReact Queryフック
 * メインプロセスと通信して設定の読み書きを行う
 */
export function useSettings() {
  const queryClient = useQueryClient();

  // クエリ: メインプロセスから設定を取得する
  const { data: settings, isLoading, isError, error } = useQuery<AppSettings>({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: async () => {
      // preload.tsで公開したAPIを呼び出す
      const result = await window.api.getSettings();
      if (!result) {
        // React Queryはundefinedをエラーとして扱わないため、明示的にエラーをスローする
        throw new Error("Settings could not be loaded from the main process.");
      }
      return result;
    },
    // staleTime: 1000 * 60 * 5, // 5分間はキャッシュを有効にする
    refetchOnWindowFocus: false, // ウィンドウフォーカスで再取得しない
  });

  // ミューテーション: メインプロセスに設定を保存する
  const { mutate: updateSettings, isPending: isUpdating } = useMutation<void, Error, Partial<AppSettings>>({
    mutationFn: async (newSettingsPatch: Partial<AppSettings>) => {
      // 現在の設定とマージして完全なオブジェクトを渡す
      const currentSettings = queryClient.getQueryData<AppSettings>(SETTINGS_QUERY_KEY);
      if (!currentSettings) {
        throw new Error("Cannot update settings: current settings not available.");
      }
      // NOTE: ここは簡易的なマージ。ネストされたオブジェクトはうまくマージされないので注意。
      // より堅牢にするなら、メインプロセス側でマージ処理を行うか、 immerなどを使う。
      const newSettings = { ...currentSettings, ...newSettingsPatch };
      await window.api.setSettings(newSettings);
    },
    onSuccess: () => {
      // 保存が成功したら、キャッシュを無効化してUIを最新の状態に更新する
      queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEY });
    },
    onError: (error) => {
      // TODO: トースト通知などでエラーをユーザーに知らせる
      console.error("Failed to update settings:", error);
    },
  });

  return {
    settings,
    isLoading,
    isError,
    error,
    updateSettings,
    isUpdating,
  };
}
