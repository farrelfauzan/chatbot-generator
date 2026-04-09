import { useForm } from "@tanstack/react-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { useUpdateCategory } from "@/hooks/use-categories"
import type { Category } from "@/lib/api"

const categoryFormSchema = z.object({
  name: z.string().min(1, "Category name is required"),
  description: z.string(),
})

interface EditCategoryDialogProps {
  category: Category
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditCategoryDialog({
  category,
  open,
  onOpenChange,
}: EditCategoryDialogProps) {
  const updateCategory = useUpdateCategory()

  const form = useForm({
    defaultValues: {
      name: category.name,
      description: category.description ?? "",
    },
    validators: {
      onSubmit: categoryFormSchema,
    },
    onSubmit: async ({ value }) => {
      updateCategory.mutate(
        {
          id: category.id,
          data: {
            name: value.name,
            description: value.description || undefined,
          },
        },
        {
          onSuccess: () => onOpenChange(false),
        },
      )
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit category</DialogTitle>
          <DialogDescription>Update category details.</DialogDescription>
        </DialogHeader>
        <form
          id="edit-category-form"
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
        >
          <FieldGroup>
            <form.Field
              name="name"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor="edit-name">Name *</FieldLabel>
                    <Input
                      id="edit-name"
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                    />
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                )
              }}
            />

            <form.Field
              name="description"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor="edit-description">
                      Description
                    </FieldLabel>
                    <Textarea
                      id="edit-description"
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      rows={2}
                    />
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                )
              }}
            />
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button
            variant="outline"
            type="button"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting]}
            children={([canSubmit, isSubmitting]) => (
              <Button
                type="submit"
                form="edit-category-form"
                disabled={
                  !canSubmit || isSubmitting || updateCategory.isPending
                }
              >
                {updateCategory.isPending ? "Saving..." : "Save Changes"}
              </Button>
            )}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
