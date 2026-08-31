import { useQuery } from '@tanstack/react-query';
import { kpiEndpoints } from '@/api/endpoints/kpi.endpoints';
import { toNumber } from '@/utils/numberUtils';

/**
 * Hedefin okunduğu KPI — backend `common/kpi/target-roi.ts#TARGET_ROI_KPI_CODE`
 * ile AYNI kod. Eşik `kpis.target_roi_threshold` alanında yaşar.
 */
export const TARGET_ROI_KPI_CODE = 'GP_ROI_PCT';

/**
 * `T-344` / `§2.3` — **EŞİK KODDAN DEĞİL, KONFİGÜRASYONDAN.**
 *
 * `PlanApprovalsPage` bu değeri `2026-08-31`'e kadar **koda gömülü `20`**
 * olarak taşıyordu. Admin `GET/PATCH /master-data/kpis` üzerinden hedefi
 * değiştirebiliyordu ve **onay ekranı bunu hiç görmüyordu.**
 *
 * ⛔ **Dönüş `number | null`, ve `null` bir HATA DEĞİL bir CEVAPTIR:**
 * KPI kaydı yoksa ya da eşik tanımlı değilse *"hedefin altında"* diye bir
 * yargı **verilemez**. Bir varsayılana düşmek (`?? 20`) uydurulmuş bir
 * hedefe göre yargı vermek olurdu — `§2.5`'in uyarı katmanındaki hâli, ve
 * `evaluateTargetRoi`'nin `NOT_EVALUABLE` dalının var-oluş sebebi.
 */
export function useTargetRoiThreshold(): number | null {
  const { data } = useQuery({
    queryKey: ['kpis', 'target-roi-threshold'],
    queryFn: () => kpiEndpoints.getAll(true).then((res) => res.data),
    staleTime: 5 * 60 * 1000,
  });

  const kpi = data?.find((k) => k.kpiCode === TARGET_ROI_KPI_CODE);
  // `decimal` kolonu API'den DİZGE gelebilir (`"20.0000"`) — `toNumber`
  // kanonik biçimi okur ve okunamayanı `0`'a değil `null`'a düşürür.
  return toNumber(kpi?.targetRoiThreshold ?? null);
}
