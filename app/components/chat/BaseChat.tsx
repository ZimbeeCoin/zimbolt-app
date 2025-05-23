/*
 * @ts-nocheck
 * Preventing TS checks with files presented in the video for a better presentation.
 */
import type { Message } from 'ai';
import React, { type RefCallback } from 'react';
import { ClientOnly } from 'remix-utils/client-only';
import { Menu } from '~/components/sidebar/Menu.client';
import { IconButton } from '~/components/ui/IconButton';
import { Workbench } from '~/components/workbench/Workbench.client';
import { classNames } from '~/utils/classNames';
import { PROVIDER_LIST } from '~/utils/constants';
import { Messages } from './Messages.client';
import { SendButton } from './SendButton.client';
import { APIKeyManager } from './APIKeyManager';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import styles from './BaseChat.module.scss';
import { ExportChatButton } from '~/components/chat/chatExportAndImport/ExportChatButton';
import { ImportButtons } from '~/components/chat/chatExportAndImport/ImportButtons';
import { ExamplePrompts } from '~/components/chat/ExamplePrompts';
import GitCloneButton from './GitCloneButton';
import FilePreview from './FilePreview';
import { ModelSelector } from '~/components/chat/ModelSelector';
import { SpeechRecognitionButton } from '~/components/chat/SpeechRecognition';
import type { ProviderInfo } from '~/types/model';
import { ScreenshotStateManager } from './ScreenshotStateManager';
import { toast } from 'react-toastify';
import StarterTemplates from './StarterTemplates';
import type { ActionAlert } from '~/types/actions';
import ChatAlert from './ChatAlert';
import type { ModelInfo } from '~/lib/modules/llm/types';

const TEXTAREA_MIN_HEIGHT = 76;

// No-op function to avoid empty function ESLint warning
const noop = (): void => {
  // Intentionally empty to serve as a safe default
};

interface BaseChatProps {
  textareaRef?: React.RefObject<HTMLTextAreaElement> | undefined;
  scrollRef?: RefCallback<HTMLDivElement> | undefined;
  messageRef?: RefCallback<HTMLDivElement> | undefined;
  showChat?: boolean;
  chatStarted?: boolean;
  isStreaming?: boolean;
  description?: string;
  enhancingPrompt?: boolean;
  promptEnhanced?: boolean;
  input?: string;
  model?: string;
  setModel?: (model: string) => void;
  provider?: ProviderInfo;
  setProvider?: (provider: ProviderInfo) => void;
  providerList?: ProviderInfo[];
  apiKeys?: Record<string, string>;
  modelList?: ModelInfo[];
  isModelSettingsCollapsed?: boolean;
  setIsModelSettingsCollapsed?: (collapsed: boolean) => void;
  isListening?: boolean;
  startListening?: () => void;
  stopListening?: () => void;
  setTranscript?: (transcript: string) => void;
  transcript?: string;
  isModelLoading?: string | undefined;
  onApiKeysChange?: (providerName: string, apiKey: string) => void;
  handleStop?: () => void;
  sendMessage?: (event: React.UIEvent, messageInput?: string) => void;
  handleInputChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  enhancePrompt?: () => void;
  importChat?: (description: string, messages: Message[]) => Promise<void>;
  exportChat?: () => void;
  uploadedFiles?: File[];
  setUploadedFiles?: (files: File[]) => void;
  imageDataList?: string[];
  setImageDataList?: (dataList: string[]) => void;
  messages?: Message[];
  actionAlert?: ActionAlert;
  clearAlert?: () => void;
}

export const BaseChat = React.forwardRef<HTMLDivElement, BaseChatProps>(
  (
    {
      textareaRef,
      scrollRef,
      messageRef,
      showChat = true,
      chatStarted = false,
      isStreaming = false,
      model,
      setModel,
      provider,
      setProvider,
      providerList,
      apiKeys = {},
      modelList = [],
      isModelSettingsCollapsed = false,
      setIsModelSettingsCollapsed,
      isListening = false,
      startListening = noop,
      stopListening = noop,
      setTranscript,
      isModelLoading,
      onApiKeysChange,
      input = '',
      enhancingPrompt,
      handleInputChange,
      enhancePrompt,
      sendMessage,
      handleStop,
      importChat,
      exportChat,
      uploadedFiles = [],
      setUploadedFiles,
      imageDataList = [],
      setImageDataList,
      messages = [],
      actionAlert,
      clearAlert,
    },
    ref,
  ) => {
    const TEXTAREA_MAX_HEIGHT = chatStarted ? 400 : 200;

    const handleSendMessage = (event: React.UIEvent, messageInput?: string) => {
      if (sendMessage) {
        sendMessage(event, messageInput);
        setTranscript?.('');

        if (handleInputChange) {
          const syntheticEvent = { target: { value: '' } } as React.ChangeEvent<HTMLTextAreaElement>;
          handleInputChange(syntheticEvent);
        }
      }
    };

    const handleFileUpload = () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';

      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];

        if (file) {
          const reader = new FileReader();

          reader.onload = (e) => {
            const base64Image = e.target?.result as string;
            setUploadedFiles?.([...uploadedFiles, file]);
            setImageDataList?.([...imageDataList, base64Image]);
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    };

    const handlePaste = async (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;

      if (!items) {
        return;
      }

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();

          const file = item.getAsFile();

          if (file) {
            const reader = new FileReader();

            reader.onload = (e) => {
              const base64Image = e.target?.result as string;
              setUploadedFiles?.([...uploadedFiles, file]);
              setImageDataList?.([...imageDataList, base64Image]);
            };
            reader.readAsDataURL(file);
          }

          break;
        }
      }
    };

    return (
      <TooltipProvider>
        <div
          ref={ref}
          className={classNames(styles.BaseChat, 'relative flex h-full w-full overflow-hidden')}
          data-chat-visible={showChat}
        >
          <ClientOnly>{() => <Menu />}</ClientOnly>
          <div ref={scrollRef} className="flex flex-col lg:flex-row overflow-y-auto w-full h-full">
            <div className={classNames(styles.Chat, 'flex flex-col flex-grow lg:min-w-[var(--chat-min-width)] h-full')}>
              {!chatStarted && (
                <div id="intro" className="mt-[16vh] max-w-chat mx-auto text-center px-4 lg:px-0">
                  <h1 className="text-3xl lg:text-6xl font-bold text-bolt-elements-textPrimary mb-4 animate-fade-in">
                    🦝 Code Smarter ⚡ Not Harder
                  </h1>
                  <p className="text-md lg:text-xl mb-8 text-bolt-elements-textSecondary animate-fade-in animation-delay-200">
                    Zimbolt accelerates your development workflow with AI-powered automation. Whether it’s DeFi, Web3,
                    or traditional app development, we’ve got you covered.
                  </p>
                </div>
              )}
              <div
                className={classNames('pt-6 px-2 sm:px-6', {
                  'h-full flex flex-col': chatStarted,
                })}
              >
                <ClientOnly>
                  {() =>
                    chatStarted ? (
                      <Messages
                        ref={messageRef}
                        className="flex flex-col w-full flex-1 max-w-chat pb-6 mx-auto z-1"
                        messages={messages}
                        isStreaming={isStreaming}
                      />
                    ) : null
                  }
                </ClientOnly>
                <div
                  className={classNames('flex flex-col gap-4 w-full max-w-chat mx-auto z-prompt mb-6', {
                    'sticky bottom-2': chatStarted,
                  })}
                >
                  <div className="bg-bolt-elements-background-depth-2">
                    {actionAlert && (
                      <ChatAlert
                        alert={actionAlert}
                        clearAlert={() => clearAlert?.()}
                        postMessage={(message) => {
                          sendMessage?.({} as any, message);
                          clearAlert?.();
                        }}
                      />
                    )}
                  </div>
                  <div
                    className={classNames(
                      'bg-bolt-elements-background-depth-2 p-3 rounded-lg border border-bolt-elements-borderColor relative w-full max-w-chat mx-auto z-prompt',
                    )}
                  >
                    <svg className={classNames(styles.PromptEffectContainer)}>
                      <defs>
                        <linearGradient
                          id="line-gradient"
                          x1="20%"
                          y1="0%"
                          x2="-14%"
                          y2="10%"
                          gradientUnits="userSpaceOnUse"
                          gradientTransform="rotate(-45)"
                        >
                          <stop offset="0%" stopColor="#b44aff" stopOpacity="0%"></stop>
                          <stop offset="40%" stopColor="#b44aff" stopOpacity="80%"></stop>
                          <stop offset="50%" stopColor="#b44aff" stopOpacity="80%"></stop>
                          <stop offset="100%" stopColor="#b44aff" stopOpacity="0%"></stop>
                        </linearGradient>
                        <linearGradient id="shine-gradient">
                          <stop offset="0%" stopColor="white" stopOpacity="0%"></stop>
                          <stop offset="40%" stopColor="#ffffff" stopOpacity="80%"></stop>
                          <stop offset="50%" stopColor="#ffffff" stopOpacity="80%"></stop>
                          <stop offset="100%" stopColor="white" stopOpacity="0%"></stop>
                        </linearGradient>
                      </defs>
                      <rect
                        className={classNames(styles.PromptEffectLine)}
                        pathLength="100"
                        strokeLinecap="round"
                      ></rect>
                      <rect className={classNames(styles.PromptShine)} x="48" y="24" width="70" height="1"></rect>
                    </svg>
                    <div>
                      <ClientOnly>
                        {() => (
                          <div className={isModelSettingsCollapsed ? 'hidden' : ''}>
                            <ModelSelector
                              key={provider?.name + ':' + modelList.length}
                              model={model}
                              setModel={setModel}
                              modelList={modelList}
                              provider={provider}
                              setProvider={setProvider}
                              providerList={providerList || (PROVIDER_LIST as ProviderInfo[])}
                              apiKeys={apiKeys}
                              modelLoading={isModelLoading}
                            />
                            {(providerList || []).length > 0 && provider && (
                              <APIKeyManager
                                provider={provider}
                                apiKey={apiKeys[provider.name] || ''}
                                setApiKey={(key) => onApiKeysChange?.(provider.name, key)}
                              />
                            )}
                          </div>
                        )}
                      </ClientOnly>
                    </div>
                    <FilePreview
                      files={uploadedFiles}
                      imageDataList={imageDataList}
                      onRemove={(index) => {
                        setUploadedFiles?.(uploadedFiles.filter((_, i) => i !== index));
                        setImageDataList?.(imageDataList.filter((_, i) => i !== index));
                      }}
                    />
                    <ClientOnly>
                      {() => (
                        <ScreenshotStateManager
                          setUploadedFiles={setUploadedFiles}
                          setImageDataList={setImageDataList}
                          uploadedFiles={uploadedFiles}
                          imageDataList={imageDataList}
                        />
                      )}
                    </ClientOnly>
                    <div
                      className={classNames(
                        'relative shadow-xs border border-bolt-elements-borderColor backdrop-blur rounded-lg',
                      )}
                    >
                      <textarea
                        ref={textareaRef}
                        className={classNames(
                          'w-full pl-4 pt-4 pr-16 outline-none resize-none text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary bg-transparent text-sm',
                          'transition-all duration-200',
                          'hover:border-bolt-elements-focus',
                        )}
                        onDragEnter={(e) => {
                          e.preventDefault();
                          e.currentTarget.style.border = '2px solid #1488fc';
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.currentTarget.style.border = '2px solid #1488fc';
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          e.currentTarget.style.border = '1px solid var(--bolt-elements-borderColor)';
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.currentTarget.style.border = '1px solid var(--bolt-elements-borderColor)';

                          const files = Array.from(e.dataTransfer.files);
                          files.forEach((file) => {
                            if (file.type.startsWith('image/')) {
                              const reader = new FileReader();

                              reader.onload = (e) => {
                                const base64Image = e.target?.result as string;
                                setUploadedFiles?.([...uploadedFiles, file]);
                                setImageDataList?.([...imageDataList, base64Image]);
                              };
                              reader.readAsDataURL(file);
                            }
                          });
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            if (event.shiftKey) {
                              return;
                            }

                            event.preventDefault();

                            if (isStreaming) {
                              handleStop?.();
                              return;
                            }

                            if (event.nativeEvent.isComposing) {
                              return;
                            }

                            handleSendMessage?.(event);
                          }
                        }}
                        value={input}
                        onChange={(event) => handleInputChange?.(event)}
                        onPaste={handlePaste}
                        style={{ minHeight: TEXTAREA_MIN_HEIGHT, maxHeight: TEXTAREA_MAX_HEIGHT }}
                        placeholder="Ready to automate? Tell me your vision."
                        translate="no"
                      />
                      <ClientOnly>
                        {() => (
                          <SendButton
                            show={input.length > 0 || isStreaming || uploadedFiles.length > 0}
                            isStreaming={isStreaming}
                            disabled={!providerList || providerList.length === 0}
                            onClick={(event) => {
                              if (isStreaming) {
                                handleStop?.();
                                return;
                              }

                              if (input.length > 0 || uploadedFiles.length > 0) {
                                handleSendMessage?.(event);
                              }
                            }}
                          />
                        )}
                      </ClientOnly>
                      <div className="flex justify-between items-center text-sm p-4 pt-2">
                        <div className="flex gap-1 items-center">
                          <IconButton title="Upload file" className="transition-all" onClick={() => handleFileUpload()}>
                            <div className="i-ph:paperclip text-xl"></div>
                          </IconButton>
                          <IconButton
                            title="Enhance prompt"
                            disabled={input.length === 0 || enhancingPrompt}
                            className={classNames('transition-all', enhancingPrompt ? 'opacity-100' : '')}
                            onClick={() => {
                              enhancePrompt?.();
                              toast.success('Prompt enhanced!');
                            }}
                          >
                            {enhancingPrompt ? (
                              <div className="i-svg-spinners:90-ring-with-bg text-bolt-elements-loader-progress text-xl animate-spin"></div>
                            ) : (
                              <div className="i-bolt:stars text-xl"></div>
                            )}
                          </IconButton>
                          <SpeechRecognitionButton
                            isListening={isListening}
                            onStart={startListening}
                            onStop={stopListening}
                            disabled={isStreaming}
                          />
                          {chatStarted && <ClientOnly>{() => <ExportChatButton exportChat={exportChat} />}</ClientOnly>}
                          <IconButton
                            title="Model Settings"
                            className="transition-all flex items-center gap-1"
                            isActive={isModelSettingsCollapsed}
                            onClick={() => setIsModelSettingsCollapsed?.(!isModelSettingsCollapsed)}
                            disabled={!providerList || providerList.length === 0}
                          >
                            <div className={`i-ph:caret-${isModelSettingsCollapsed ? 'right' : 'down'} text-lg`} />
                            {isModelSettingsCollapsed ? <span className="text-xs">{model}</span> : <span />}
                          </IconButton>
                        </div>
                        {input.length > 3 ? (
                          <div className="text-xs text-bolt-elements-textTertiary">
                            Use{' '}
                            <kbd className="kdb px-1.5 py-0.5 rounded bg-bolt-elements-background-depth-2">Shift</kbd> +{' '}
                            <kbd className="kbd px-1.5 py-0.5 rounded bg-bolt-elements-background-depth-2">Return</kbd>{' '}
                            a new line
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {!chatStarted && (
                <div className="flex flex-col justify-center gap-5">
                  <div className="flex justify-center gap-2">
                    {ImportButtons(importChat)}
                    <GitCloneButton importChat={importChat} />
                  </div>
                  {ExamplePrompts((event, messageInput) => {
                    if (isStreaming) {
                      handleStop?.();
                      return;
                    }

                    if (!messageInput || messageInput.trim().length === 0) {
                      return;
                    }

                    handleSendMessage?.(event, messageInput);
                  })}
                  <StarterTemplates />
                </div>
              )}
            </div>
            <ClientOnly>{() => <Workbench chatStarted={chatStarted} isStreaming={isStreaming} />}</ClientOnly>
          </div>
        </div>
      </TooltipProvider>
    );
  },
);
