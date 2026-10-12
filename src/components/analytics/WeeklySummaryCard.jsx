import React from 'react';
import { TrendingUp, TrendingDown, Award, Clock } from 'lucide-react';
import Card from '../common/Card';
import Badge from '../common/Badge';

export default function WeeklySummaryCard({ summary }) {
  if (!summary) return null;

  return (
    <Card className="bg-gradient-to-br from-cream-100/70 to-cream-50 dark:from-charcoal-850 dark:to-charcoal-900">
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-cream-200 dark:border-charcoal-750">
        <div>
          <h4 className="font-serif text-base font-medium text-espresso-900 dark:text-cream-50">
            Weekly Momentum Summary
          </h4>
          <p className="text-xs text-espresso-500 dark:text-cream-400">
            Comparison between current week and prior 7 days
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          {summary.isIncrease ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
              <TrendingUp className="w-3.5 h-3.5" />
              +{summary.deltaPercent}%
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800">
              <TrendingDown className="w-3.5 h-3.5" />
              {summary.deltaPercent}%
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-5">
        <div>
          <span className="text-xs text-espresso-500 dark:text-cream-400">This Week</span>
          <div className="font-serif text-2xl font-semibold text-espresso-900 dark:text-cream-50 tabular-nums">
            {summary.currentWeekHours}h
          </div>
        </div>

        <div>
          <span className="text-xs text-espresso-500 dark:text-cream-400">Previous Week</span>
          <div className="font-serif text-2xl font-semibold text-espresso-900 dark:text-cream-50 tabular-nums">
            {summary.prevWeekHours}h
          </div>
        </div>
      </div>

      <div>
        <span className="block text-xs font-semibold text-espresso-700 dark:text-cream-300 mb-2">
          Most-Studied Subjects This Week
        </span>
        {summary.mostStudiedSubjects.length === 0 ? (
          <p className="text-xs text-espresso-400 dark:text-cream-400 italic">
            No study sessions logged for this week yet.
          </p>
        ) : (
          <div className="space-y-1.5">
            {summary.mostStudiedSubjects.map((sub, idx) => (
              <div
                key={sub.id}
                className="flex items-center justify-between text-xs p-2 rounded-lg bg-cream-50 dark:bg-charcoal-800 border border-cream-200 dark:border-charcoal-750"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-espresso-400 dark:text-cream-400 text-[11px]">
                    #{idx + 1}
                  </span>
                  <span className="font-medium text-espresso-800 dark:text-cream-100">
                    {sub.name}
                  </span>
                </div>
                <span className="font-mono text-espresso-600 dark:text-cream-300">
                  {Math.floor(sub.minutes / 60)}h {sub.minutes % 60}m
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
