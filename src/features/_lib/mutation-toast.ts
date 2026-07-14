import { toast } from "sonner";

type ToastMessages = {
  /** Shown with spinner while the mutation runs */
  loading: string;
  /** Replaces the loading toast on success */
  success: string;
  /** Prepend to error message (optional) */
  errorPrefix?: string;
};

type ToastCtx = { toastId: string | number };

/**
 * Standard loading → success|error toasts (single id) for useMutation.
 * Use with: ...withMutationToasts(t), or pass plain strings.
 */
export function withMutationToasts<TData = unknown, TVariables = unknown, TError = Error>(
  messages: ToastMessages
) {
  return {
    onMutate: () => {
      const toastId = toast.loading(messages.loading);
      return { toastId } satisfies ToastCtx;
    },
    onSuccess: (_d: TData, _v: TVariables, ctx: ToastCtx | undefined) => {
      if (ctx != null) {
        toast.success(messages.success, { id: ctx.toastId });
      } else {
        toast.success(messages.success);
      }
    },
    onError: (e: TError, _v: TVariables, ctx: ToastCtx | undefined) => {
      const msg =
        e instanceof Error
          ? messages.errorPrefix
            ? `${messages.errorPrefix}: ${e.message}`
            : e.message
          : "Error";
      if (ctx != null) {
        toast.error(msg, { id: ctx.toastId });
      } else {
        toast.error(msg);
      }
    },
  };
}

/**
 * For mutations that only toast success / error (no long loading), or delete with simple feedback.
 */
export function mergeMutationToasts<TData = unknown, TVariables = unknown, TError = Error>(
  messages: ToastMessages,
  extra?: {
    onSuccess?: (data: TData, variables: TVariables, ctx: ToastCtx | undefined) => void;
  }
) {
  const base = withMutationToasts<TData, TVariables, TError>(messages);
  return {
    onMutate: base.onMutate,
    onError: base.onError,
    onSuccess: (data: TData, variables: TVariables, ctx: ToastCtx | undefined) => {
      base.onSuccess(data, variables, ctx);
      extra?.onSuccess?.(data, variables, ctx);
    },
  };
}

export function toastErrorOnly<TError = Error>(e: TError) {
  const msg = e instanceof Error ? e.message : "Error";
  toast.error(msg);
}
