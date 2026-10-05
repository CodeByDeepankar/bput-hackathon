import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { cn } from './ui/utils';

/**
 * SkillTrackCard
 * Props:
 * - title: string
 * - icon: ReactNode (lucide icon element recommended)
 * - progress: number (0-100)
 * - isRecommended: boolean (adds glow + tag)
 * - onContinue?: () => void (optional action handlers)
 * - onPractice?: () => void
 */
export default function SkillTrackCard({ title, icon, progress = 0, isRecommended = false, imageSrc, variant = 'compact', footer, onContinue, onPractice, onContinueClick, className }) {
  return (
    <Card
      className={cn(
        'relative overflow-hidden border-2 transition-all',
        'bg-slate-700/60 dark:bg-slate-800/80 hover:border-purple-400',
        isRecommended && 'border-purple-400 shadow-[0_0_0_3px_rgba(168,85,247,0.25)]',
        className
      )}
    >
      {isRecommended && (
        <div className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-purple-400/40" />
      )}
      {variant === 'image-cover' && imageSrc ? (
        <CardContent className="p-0">
          <div className="flex flex-col h-full">
            <div className="w-full h-40 md:h-44 lg:h-48 overflow-hidden">
              <img src={imageSrc} alt={title} className="w-full h-full object-cover" />
            </div>
            <div className="p-5">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-lg text-white truncate skillTitle">{title}</h3>
                {isRecommended && (
                  <Badge className="bg-purple-600 text-white border-0 shadow-sm">AI Recommended</Badge>
                )}
              </div>
              <div className="text-sm text-gray-300 mb-2 skillProgressText">{progress}% Mastered</div>
              <Progress value={progress} className="h-2.5 mb-1" />
              {footer}
              {!footer && typeof onContinueClick === 'function' && (
                <div className="mt-4">
                  <Button size="sm" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white" onClick={onContinueClick}>
                    Continue Learning
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      ) : (
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            {imageSrc ? (
              <div className="w-14 h-14 rounded-xl overflow-hidden ring-1 ring-white/10 shadow-lg bg-slate-900">
                <img src={imageSrc} alt={title} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className={cn('w-14 h-14 rounded-xl grid place-items-center text-white shadow-lg',
                'bg-gradient-to-br from-indigo-500 to-purple-600')}
              >
                {icon}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-lg text-white truncate skillTitle">{title}</h3>
                {isRecommended && (
                  <Badge className="bg-purple-600 text-white border-0 shadow-sm">AI Recommended</Badge>
                )}
              </div>
              <div className="text-sm text-gray-300 mb-2 skillProgressText">{progress}% Mastered</div>
              <Progress value={progress} className="h-2.5 mb-1" />
            </div>
          </div>
          {footer}
          {!footer && typeof onContinueClick === 'function' && (
            <div className="mt-4">
              <Button size="sm" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white" onClick={onContinueClick}>
                Continue Learning
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
