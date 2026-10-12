import React from 'react';
import { Sparkles, Calendar, AlertCircle } from 'lucide-react';
import Card from '../common/Card';
import Badge from '../common/Badge';
import { calculateTargetProjections } from '../../services/analyticsEngine';

export default function ProjectionsCard({ subjects = [], recentSessions = [] }) {
  if (subjects.length === 0) return null;

  return (
    <Card>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-serif text-base font-medium text-espresso-900 dark:text-cream-50">
          Target Completion Projections
        </h4>
        <span className="text-[11px] font-mono text-espresso-400 dark:text-cream-400">
          7-Day Velocity
        </span>
      </div>

      {/* Mandatory Disclaimer from Specification */}
      <div className="p-3 rounded-xl bg-cream-100 dark:bg-charcoal-800 border border-cream-200 dark:border-charcoal-700 text-xs text-espresso-600 dark:text-cream-300 flex items-start gap-2 mb-4">
        <AlertCircle className="w-4 h-4 text-lilac-600 dark:text-lavender-400 shrink-0 mt-0.5" />
        <span>
          <strong>Notice:</strong> Projections are calculated as estimates based on your recent 7-day daily pace. These are directional estimates only, not guarantees.
        </span>
      </div>

      <div className="space-y-3">
        {subjects.map((sub) => {
          const subSessions = recentSessions.filter((s) => s.subjectId === sub.id);
          const studiedMinutes = subSessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
          const goalTotalMinutes = (Number(sub.dailyTargetMinutes) || 60) * 30; // 30-day curriculum target

          const proj = calculateTargetProjections({
            subject: sub,
            currentStudiedMinutes: studiedMinutes,
            goalTotalMinutes,
            recentSessions,
            windowDays: 7,
          });

          return (
            <div
              key={sub.id}
              className="p-3 rounded-xl bg-cream-50 dark:bg-charcoal-900 border border-cream-200 dark:border-charcoal-750 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
            >
              <div>
                <span className="font-semibold text-espresso-900 dark:text-cream-50">
                  {sub.name}
                </span>
                <span className="text-[11px] text-espresso-400 dark:text-cream-400 block mt-0.5">
                  Goal: {Math.round(goalTotalMinutes / 60)}h total · Studied: {Math.round(studiedMinutes / 60)}h
                </span>
              </div>

              <div className="text-right">
                {proj.status === 'projected' ? (
                  <>
                    <span className="font-medium text-lilac-700 dark:text-lavender-300">
                      ~{proj.daysRemaining} days remaining
                    </span>
                    <span className="block text-[11px] font-mono text-espresso-500 dark:text-cream-400">
                      Est. {proj.projectedDate}
                    </span>
                  </>
                ) : (
                  <span className="text-[11px] text-espresso-400 dark:text-cream-400 italic">
                    {proj.disclaimer}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
