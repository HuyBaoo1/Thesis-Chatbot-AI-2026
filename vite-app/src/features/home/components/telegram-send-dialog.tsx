import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Send, MessageSquare } from "lucide-react"
import { useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useMutation } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import axios from "@/lib/axios"
import { z } from "zod"

type TelegramSendDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const inputClassName =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-primary/50"

const TelegramSendDialog = ({
  open,
  onOpenChange,
}: TelegramSendDialogProps) => {
  const { t } = useTranslation("home")

  const telegramSendSchema = useMemo(
    () =>
      z.object({
        chat_id: z
          .number()
          .int()
          .refine((v) => v !== 0, t("telegram.chatIdValidation")),
        text: z
          .string()
          .min(1, t("telegram.messageRequired"))
          .max(4096, t("telegram.messageTooLong")),
      }),
    [t]
  )

  type TelegramSendSchema = z.infer<typeof telegramSendSchema>

  const form = useForm<TelegramSendSchema>({
    resolver: zodResolver(telegramSendSchema) as any,
    defaultValues: {
      chat_id: 0,
      text: "",
    },
  })

  useEffect(() => {
    if (!open) {
      form.reset()
    }
  }, [form, open])

  const sendMutation = useMutation({
    mutationFn: async (data: TelegramSendSchema) => {
      await axios.post("/telegram/send", null, {
        params: {
          chat_id: data.chat_id,
          text: data.text,
        },
      })
    },
    onSuccess: () => {
      onOpenChange(false)
      form.reset()
    },
  })

  const handleSubmit = async (values: TelegramSendSchema) => {
    await sendMutation.mutateAsync(values)
  }

  const onSubmit = form.handleSubmit(handleSubmit)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-1.5rem)] gap-0 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-slate-200 px-6 py-5">
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold text-slate-950">
            <MessageSquare className="h-5 w-5 text-primary" />
            {t("telegram.title")}
          </DialogTitle>
          <DialogDescription className="max-w-xl text-sm leading-6 text-slate-600">
            {t("telegram.description")}
          </DialogDescription>
        </DialogHeader>

        <form
          noValidate
          className="px-6 py-6"
          onSubmit={onSubmit}
        >
          <FieldGroup className="gap-5">
            <Field>
              <FieldLabel htmlFor="telegram-chat-id">{t("telegram.chatIdLabel")}</FieldLabel>
              <FieldContent>
                <input
                  id="telegram-chat-id"
                  type="number"
                  className={inputClassName}
                  placeholder="123456789"
                  {...form.register("chat_id")}
                />
                <FieldDescription>
                  {t("telegram.chatIdDescription")}
                </FieldDescription>
                <FieldError errors={[form.formState.errors.chat_id]} />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="telegram-text">{t("telegram.messageLabel")}</FieldLabel>
              <FieldContent>
                <textarea
                  id="telegram-text"
                  rows={4}
                  className={`${inputClassName} resize-none py-3`}
                  placeholder={t("telegram.messagePlaceholder")}
                  {...form.register("text")}
                />
                <FieldError errors={[form.formState.errors.text]} />
              </FieldContent>
            </Field>
          </FieldGroup>

          {sendMutation.isError && (
            <p className="mt-4 text-sm text-destructive">
              {t("telegram.error")}
            </p>
          )}

          <DialogFooter className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50/80">
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              disabled={sendMutation.isPending}
              onClick={() => onOpenChange(false)}
            >
              {t("close", { ns: "common" })}
            </Button>
            <Button
              type="submit"
              className="cursor-pointer"
              disabled={form.formState.isSubmitting || sendMutation.isPending}
            >
              {sendMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {sendMutation.isPending ? t("chat.sending") : t("telegram.sendButton")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default TelegramSendDialog