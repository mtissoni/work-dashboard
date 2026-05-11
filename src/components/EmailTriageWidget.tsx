import type { EmailCacheRow, ViewType } from '../types'

interface EmailTriageWidgetProps {
  actionableEmails: EmailCacheRow[]
  totalCount: number
  onNavigate: (view: ViewType) => void
}

export function EmailTriageWidget({
  actionableEmails,
  totalCount,
  onNavigate,
}: EmailTriageWidgetProps) {
  const top5 = actionableEmails.slice(0, 5)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Email Triage</h2>
        <button
          onClick={() => onNavigate('inbox')}
          className="text-sm text-blue-600 hover:text-blue-700 cursor-pointer"
        >
          View Inbox
        </button>
      </div>

      {actionableEmails.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">
          Inbox clear. No emails need attention.
        </p>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-3">
            <span className="font-medium text-blue-600">{actionableEmails.length}</span> emails
            need attention
            {totalCount > actionableEmails.length && (
              <span className="text-gray-400"> out of {totalCount} total</span>
            )}
          </p>

          <div className="space-y-2">
            {top5.map((email) => (
              <div
                key={email.id}
                onClick={() => onNavigate('inbox')}
                className="flex items-center gap-2.5 py-1.5 cursor-pointer hover:bg-gray-50 rounded px-1 -mx-1"
              >
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium flex-shrink-0">
                  {(email.sender_name ?? email.sender_email ?? '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 truncate">
                    <span className="font-medium">
                      {email.sender_name ?? email.sender_email}
                    </span>
                    {' — '}
                    {email.subject ?? '(no subject)'}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {actionableEmails.length > 5 && (
            <p className="text-xs text-gray-400 mt-2 text-center">
              +{actionableEmails.length - 5} more
            </p>
          )}
        </>
      )}
    </div>
  )
}
