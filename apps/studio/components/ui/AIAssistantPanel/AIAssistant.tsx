import { PermissionAction } from '@supabase/shared-types/out/constants'
import type { Message as MessageType } from 'ai/react'
import { useChat } from 'ai/react'
import { AnimatePresence, motion } from 'framer-motion'
import { last } from 'lodash'
import { ArrowDown, FileText, Info, RefreshCw, X } from 'lucide-react'
import { useRouter } from 'next/router'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

import { useParams, useSearchParamsShallow } from 'common/hooks'
import { Markdown } from 'components/interfaces/Markdown'
import OptInToOpenAIToggle from 'components/interfaces/Organization/GeneralSettings/OptInToOpenAIToggle'
import { SQL_TEMPLATES } from 'components/interfaces/SQLEditor/SQLEditor.queries'
import { useCheckOpenAIKeyQuery } from 'data/ai/check-api-key-query'
import { constructHeaders } from 'data/fetchers'
import { useOrganizationUpdateMutation } from 'data/organizations/organization-update-mutation'
import { useTablesQuery } from 'data/tables/tables-query'
import { useSendEventMutation } from 'data/telemetry/send-event-mutation'
import { useCheckPermissions } from 'hooks/misc/useCheckPermissions'
import { useOrgOptedIntoAiAndHippaProject } from 'hooks/misc/useOrgOptedIntoAi'
import { useSelectedOrganization } from 'hooks/misc/useSelectedOrganization'
import { useSelectedProject } from 'hooks/misc/useSelectedProject'
import { useFlag } from 'hooks/ui/useFlag'
import { BASE_PATH, IS_PLATFORM, OPT_IN_TAGS } from 'lib/constants'
import uuidv4 from 'lib/uuid'
import { useAiAssistantStateSnapshot } from 'state/ai-assistant-state'
import { useSqlEditorV2StateSnapshot } from 'state/sql-editor-v2'
import {
  AiIconAnimation,
  Button,
  cn,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from 'ui'
import { Admonition, AssistantChatForm, GenericSkeletonLoader } from 'ui-patterns'
import ConfirmationModal from 'ui-patterns/Dialogs/ConfirmationModal'
import { ButtonTooltip } from '../ButtonTooltip'
import DotGrid from '../DotGrid'
import { AIAssistantChatSelector } from './AIAssistantChatSelector'
import AIOnboarding from './AIOnboarding'
import CollapsibleCodeBlock from './CollapsibleCodeBlock'
import { Message } from './Message'
import { useAutoScroll } from './hooks'
import { ErrorBoundary } from '../ErrorBoundary'

const MemoizedMessage = memo(
  ({
    message,
    isLoading,
    onResults,
  }: {
    message: MessageType
    isLoading: boolean
    onResults: ({
      messageId,
      resultId,
      results,
    }: {
      messageId: string
      resultId?: string
      results: any[]
    }) => void
  }) => {
    return (
      <Message
        key={message.id}
        id={message.id}
        role={message.role}
        content={message.content}
        readOnly={message.role === 'user'}
        isLoading={isLoading}
        onResults={onResults}
      />
    )
  }
)

MemoizedMessage.displayName = 'MemoizedMessage'

interface AIAssistantProps {
  initialMessages?: MessageType[] | undefined
  className?: string
}

export const AIAssistant = ({ className }: AIAssistantProps) => {
  const router = useRouter()
  const project = useSelectedProject()
  const { isOptedInToAI, isHipaaProjectDisallowed } = useOrgOptedIntoAiAndHippaProject()
  const selectedOrganization = useSelectedOrganization()
  const { ref, id: entityId } = useParams()
  const searchParams = useSearchParamsShallow()
  const includeSchemaMetadata = isOptedInToAI || !IS_PLATFORM

  const disablePrompts = useFlag('disableAssistantPrompts')
  const { snippets } = useSqlEditorV2StateSnapshot()
  const snap = useAiAssistantStateSnapshot()

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const { ref: scrollContainerRef, isSticky, scrollToEnd } = useAutoScroll()

  // Add a ref to store the last user message
  const lastUserMessageRef = useRef<MessageType | null>(null)

  const [value, setValue] = useState<string>(snap.initialInput || '')
  const [isConfirmOptInModalOpen, setIsConfirmOptInModalOpen] = useState(false)

  const { data: check, isSuccess } = useCheckOpenAIKeyQuery()
  const isApiKeySet = IS_PLATFORM || !!check?.hasKey

  const isInSQLEditor = router.pathname.includes('/sql/[id]')
  const snippet = snippets[entityId ?? '']
  const snippetContent = snippet?.snippet?.content?.sql

  const { data: tables, isLoading: isLoadingTables } = useTablesQuery(
    {
      projectRef: project?.ref,
      connectionString: project?.connectionString,
      schema: 'public',
    },
    { enabled: isApiKeySet }
  )

  const currentTable = tables?.find((t) => t.id.toString() === entityId)
  const currentSchema = searchParams?.get('schema') ?? 'public'
  const currentChat = snap.activeChat?.name

  const { mutate: sendEvent } = useSendEventMutation()

  const handleError = useCallback((error: Error) => {
    const errorMessage = JSON.parse(error.message).message
    toast.error(errorMessage)
  }, [])

  // Handle completion of the assistant's response
  const handleChatFinish = useCallback((message: MessageType) => {
    // If we have a user message stored in the ref, save both messages
    if (lastUserMessageRef.current) {
      snap.saveMessage([lastUserMessageRef.current, message])
      lastUserMessageRef.current = null
    } else {
      // Otherwise just save the assistant message
      snap.saveMessage(message)
    }
  }, [])

  // TODO(refactor): This useChat hook should be moved down into each chat session.
  // That way we won't have to disable switching chats while the chat is loading,
  // and don't run the risk of messages getting mixed up between chats.
  const {
    messages: chatMessages,
    isLoading: isChatLoading,
    append,
    setMessages,
  } = useChat({
    id: snap.activeChatId,
    api: `${BASE_PATH}/api/ai/sql/generate-v3`,
    maxSteps: 5,
    // [Alaister] typecast is needed here because valtio returns readonly arrays
    // and useChat expects a mutable array
    initialMessages: snap.activeChat?.messages as unknown as MessageType[] | undefined,
    body: {
      includeSchemaMetadata,
      projectRef: project?.ref,
      connectionString: project?.connectionString,
      schema: currentSchema,
      table: currentTable?.name,
    },
    onError: handleError,
    onFinish: handleChatFinish,
  })

  const canUpdateOrganization = useCheckPermissions(PermissionAction.UPDATE, 'organizations')
  const { mutate: updateOrganization, isLoading: isUpdating } = useOrganizationUpdateMutation()

  const updateMessage = useCallback(
    ({
      messageId,
      resultId,
      results,
    }: {
      messageId: string
      resultId?: string
      results: any[]
    }) => {
      snap.updateMessage({ id: messageId, resultId, results })
    },
    [snap]
  )

  const renderedMessages = useMemo(
    () =>
      chatMessages.map((message) => {
        return (
          <MemoizedMessage
            key={message.id}
            message={message}
            isLoading={isChatLoading && message.id === chatMessages[chatMessages.length - 1].id}
            onResults={updateMessage}
          />
        )
      }),
    [chatMessages, isChatLoading]
  )

  const hasMessages = chatMessages.length > 0

  const sendMessageToAssistant = async (content: string) => {
    const payload = { role: 'user', createdAt: new Date(), content } as MessageType
    const headerData = await constructHeaders()
    snap.clearSqlSnippets()

    // Store the user message in the ref before appending
    lastUserMessageRef.current = payload

    const authorizationHeader = headerData.get('Authorization')

    append(
      payload,
      authorizationHeader
        ? {
            headers: { Authorization: authorizationHeader },
          }
        : undefined
    )

    setValue('')

    if (content.includes('Help me to debug')) {
      sendEvent({
        action: 'assistant_debug_submitted',
        groups: {
          project: ref ?? 'Unknown',
          organization: selectedOrganization?.slug ?? 'Unknown',
        },
      })
    } else {
      sendEvent({
        action: 'assistant_prompt_submitted',
        groups: {
          project: ref ?? 'Unknown',
          organization: selectedOrganization?.slug ?? 'Unknown',
        },
      })
    }
  }

  const confirmOptInToShareSchemaData = async () => {
    if (!canUpdateOrganization) {
      return toast.error('You do not have the required permissions to update this organization')
    }

    if (!selectedOrganization?.slug) return console.error('Organization slug is required')

    const existingOptInTags = selectedOrganization?.opt_in_tags ?? []

    const updatedOptInTags = existingOptInTags.includes(OPT_IN_TAGS.AI_SQL)
      ? existingOptInTags
      : [...existingOptInTags, OPT_IN_TAGS.AI_SQL]

    updateOrganization(
      { slug: selectedOrganization?.slug, opt_in_tags: updatedOptInTags },
      {
        onSuccess: () => {
          toast.success('Successfully opted-in')
          setIsConfirmOptInModalOpen(false)
        },
      }
    )
  }

  const handleClearMessages = () => {
    snap.clearMessages()
    setMessages([])
    lastUserMessageRef.current = null
  }

  // Update scroll behavior for new messages
  useEffect(() => {
    if (!isChatLoading) {
      if (inputRef.current) inputRef.current.focus()
    }

    if (isSticky) {
      setTimeout(scrollToEnd, 0)
    }
  }, [isChatLoading, isSticky, scrollToEnd])

  useEffect(() => {
    setValue(snap.initialInput || '')
    if (inputRef.current && snap.initialInput) {
      inputRef.current.focus()
      inputRef.current.setSelectionRange(snap.initialInput.length, snap.initialInput.length)
    }
  }, [snap.initialInput])

  useEffect(() => {
    if (snap.open && isInSQLEditor && !!snippetContent) {
      snap.setSqlSnippets([snippetContent])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap.open, isInSQLEditor, snippetContent])

  return (
    <ErrorBoundary
      message="Something went wrong with the AI Assistant"
      sentryContext={{
        component: 'AIAssistant',
        feature: 'AI Assistant Panel',
        projectRef: project?.ref,
        organizationSlug: selectedOrganization?.slug,
      }}
      actions={[
        {
          label: 'Clear messages and refresh',
          onClick: () => {
            handleClearMessages()
            window.location.reload()
          },
        },
      ]}
    >
      <div className={cn('flex flex-col h-full', className)}>
        <div ref={scrollContainerRef} className={cn('flex-grow overflow-auto flex flex-col')}>
          <div className="z-30 sticky top-0">
            <div className="border-b flex items-center bg gap-x-3 pl-5 pr-4 h-[46px]">
              <AiIconAnimation allowHoverEffect />

              <div className="text-sm flex-1 flex items-center gap-x-2">
                Assistant
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info size={14} className="text-foreground-light" />
                  </TooltipTrigger>
                  <TooltipContent className="w-80">
                    The Assistant is in Alpha and your prompts might be rate limited.{' '}
                    {includeSchemaMetadata
                      ? 'Project metadata is being shared to improve Assistant responses.'
                      : 'Project metadata is not being shared. Opt in to improve Assistant responses.'}
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex items-center gap-x-4">
                <Tooltip>
                  <TooltipTrigger>
                    <p
                      title={currentChat}
                      className="text-xs text-foreground-light truncate max-w-[145px] 2xl:max-w-full"
                    >
                      {currentChat}
                    </p>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Current chat: {currentChat}</TooltipContent>
                </Tooltip>
                <div className="flex items-center gap-x-2">
                  <AIAssistantChatSelector disabled={isChatLoading} />
                  <ButtonTooltip
                    type="default"
                    size="tiny"
                    icon={<RefreshCw size={14} />}
                    onClick={handleClearMessages}
                    className="h-7 w-7 p-0"
                    disabled={isChatLoading}
                    tooltip={{ content: { side: 'bottom', text: 'Clear messages' } }}
                  />
                  <ButtonTooltip
                    type="default"
                    className="w-7 h-7"
                    onClick={snap.closeAssistant}
                    icon={<X />}
                    tooltip={{ content: { side: 'bottom', text: 'Close assistant' } }}
                  />
                </div>
              </div>
            </div>
            {!includeSchemaMetadata && selectedOrganization && (
              <Admonition
                type="default"
                title="Project metadata is not shared"
                description={
                  isHipaaProjectDisallowed
                    ? 'Your organization has the HIPAA addon and will not send project metadata with your prompts for projects marked as HIPAA.'
                    : 'The Assistant can improve the quality of the answers if you send project metadata along with your prompts. Opt into sending anonymous data to share your schema and table definitions.'
                }
                className="border-0 border-b rounded-none bg-background"
              >
                {!isHipaaProjectDisallowed && (
                  <Button
                    type="default"
                    className="w-fit mt-4"
                    onClick={() => setIsConfirmOptInModalOpen(true)}
                  >
                    Update AI settings
                  </Button>
                )}
              </Admonition>
            )}
          </div>
          {!hasMessages && (
            <div className="h-48 flex-0 m-8">
              <DotGrid rows={10} columns={10} count={33} />
            </div>
          )}
          {hasMessages ? (
            <div className="w-full p-5">
              {renderedMessages}
              {(last(chatMessages)?.role === 'user' ||
                last(chatMessages)?.content?.length === 0) && (
                <div className="flex gap-4 w-auto overflow-hidden">
                  <AiIconAnimation size={20} className="text-foreground-muted shrink-0" />
                  <div className="text-foreground-lighter text-sm flex gap-1.5 items-center">
                    <span>Thinking</span>
                    <div className="flex gap-1">
                      <motion.span
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
                      >
                        .
                      </motion.span>
                      <motion.span
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
                      >
                        .
                      </motion.span>
                      <motion.span
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: 0.6 }}
                      >
                        .
                      </motion.span>
                    </div>
                  </div>
                </div>
              )}
              <div className="h-1" />
            </div>
          ) : snap.suggestions ? (
            <div className="w-full h-full px-8 py-0 flex flex-col flex-1 justify-end">
              <h3 className="text-foreground-light font-mono text-sm uppercase mb-3">
                Suggestions
              </h3>
              {snap.suggestions.title && <p>{snap.suggestions.title}</p>}
              <div className="-mx-3 mt-4 mb-12">
                {snap.suggestions?.prompts?.map((prompt: string, idx: number) => (
                  <Button
                    key={`suggestion-${idx}`}
                    size="small"
                    icon={<FileText strokeWidth={1.5} size={16} />}
                    type="text"
                    className="w-full justify-start py-1 h-auto"
                    onClick={() => {
                      setValue(prompt)
                      if (inputRef.current && snap.initialInput) {
                        inputRef.current.focus()
                        inputRef.current.setSelectionRange(
                          snap.initialInput.length,
                          snap.initialInput.length
                        )
                      }
                    }}
                  >
                    {prompt}
                  </Button>
                ))}
              </div>
            </div>
          ) : isLoadingTables && isApiKeySet ? (
            <div className="w-full h-full flex-1 flex flex-col justify-end items-start p-5">
              {/* [Joshen] We could try play around with a custom loader for the assistant here */}
              <GenericSkeletonLoader className="w-4/5" />
            </div>
          ) : (tables ?? [])?.length > 0 ? (
            <AIOnboarding setMessages={setMessages} onSendMessage={sendMessageToAssistant} />
          ) : isApiKeySet ? (
            <div className="w-full flex flex-col justify-end flex-1 h-full p-5">
              <h2 className="text-base mb-2">Welcome to Supabase!</h2>
              <p className="text-sm text-foreground-lighter mb-6">
                This is the Supabase assistant which will help you create, debug and modify tables,
                policies, functions and more. You can even use it to query your data using just your
                words. It looks like we have a blank canvas though, so what are you looking to
                build? Here are some ideas.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => setValue('Generate a database schema for ...')}
                  className="rounded-full"
                >
                  Generate a ...
                </Button>
                {SQL_TEMPLATES.filter((t) => t.type === 'quickstart').map((qs) => (
                  <TooltipProvider key={qs.title}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="outline"
                          className="rounded-full"
                          onClick={() => {
                            setMessages([
                              {
                                id: uuidv4(),
                                role: 'user',
                                createdAt: new Date(Date.now() - 3000),
                                content: qs.description,
                              },
                              {
                                id: uuidv4(),
                                role: 'assistant',
                                createdAt: new Date(),
                                content: `Sure! I can help you with that. Here is a starting point you can run directly or customize further. Would you like to make any changes?  \n\n\`\`\`sql\n-- props: {"title": "${qs.title}"}\n${qs.sql}\n\`\`\``,
                              },
                            ])
                          }}
                        >
                          {qs.title}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{qs.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <AnimatePresence>
          {!isSticky && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="pointer-events-none z-10 -mt-24"
              >
                <div className="h-24 w-full bg-gradient-to-t from-background to-transparent" />
              </motion.div>
              <motion.div
                className="absolute bottom-20 left-1/2 -translate-x-1/2"
                variants={{
                  hidden: { y: 5, opacity: 0 },
                  show: { y: 0, opacity: 1 },
                }}
                transition={{ duration: 0.1 }}
                initial="hidden"
                animate="show"
                exit="hidden"
              >
                <Button
                  type="default"
                  className="rounded-full w-8 h-8 p-1.5"
                  onClick={() => {
                    scrollToEnd()
                    if (inputRef.current) inputRef.current.focus()
                  }}
                >
                  <ArrowDown size={16} />
                </Button>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <div className="p-5 pt-0 z-20 relative">
          {snap.sqlSnippets && snap.sqlSnippets.length > 0 && (
            <div className="mb-2">
              {snap.sqlSnippets.map((snippet: string, index: number) => (
                <CollapsibleCodeBlock
                  key={index}
                  hideLineNumbers
                  value={snippet}
                  onRemove={() => {
                    const newSnippets = [...(snap.sqlSnippets ?? [])]
                    newSnippets.splice(index, 1)
                    snap.setSqlSnippets(newSnippets)
                  }}
                  className="text-xs"
                />
              ))}
            </div>
          )}
          {disablePrompts && (
            <Admonition
              showIcon={false}
              type="default"
              title="Assistant has been temporarily disabled"
              description="We're currently looking into getting it back online"
            />
          )}

          {isSuccess && !isApiKeySet && (
            <Admonition
              type="default"
              title="OpenAI API key not set"
              description={
                <Markdown
                  content={
                    'Add your `OPENAI_API_KEY` to your environment variables to use the AI Assistant.'
                  }
                />
              }
            />
          )}

          <AssistantChatForm
            textAreaRef={inputRef}
            className={cn(
              'z-20 [&>textarea]:text-base [&>textarea]:md:text-sm [&>textarea]:border-1 [&>textarea]:rounded-md [&>textarea]:!outline-none [&>textarea]:!ring-offset-0 [&>textarea]:!ring-0'
            )}
            loading={isChatLoading}
            disabled={!isApiKeySet || disablePrompts || isChatLoading}
            placeholder={
              hasMessages
                ? 'Reply to the assistant...'
                : (snap.sqlSnippets ?? [])?.length > 0
                  ? 'Ask a question or make a change...'
                  : 'Chat to Postgres...'
            }
            value={value}
            onValueChange={(e) => setValue(e.target.value)}
            onSubmit={(event) => {
              event.preventDefault()
              if (includeSchemaMetadata) {
                const sqlSnippetsString =
                  snap.sqlSnippets
                    ?.map((snippet: string) => '```sql\n' + snippet + '\n```')
                    .join('\n') || ''
                const valueWithSnippets = [value, sqlSnippetsString].filter(Boolean).join('\n\n')
                sendMessageToAssistant(valueWithSnippets)
                scrollToEnd()
              } else {
                sendMessageToAssistant(value)
              }
            }}
          />
        </div>
      </div>

      <ConfirmationModal
        visible={isConfirmOptInModalOpen}
        size="large"
        title="Confirm sending anonymous data to OpenAI"
        confirmLabel="Confirm"
        onCancel={() => setIsConfirmOptInModalOpen(false)}
        onConfirm={confirmOptInToShareSchemaData}
        loading={isUpdating}
      >
        <p className="text-sm text-foreground-light">
          By opting into sending anonymous data, Supabase AI can improve the answers it shows you.
          This is an organization-wide setting, and affects all projects in your organization.
        </p>

        <OptInToOpenAIToggle />
      </ConfirmationModal>
    </ErrorBoundary>
  )
}
