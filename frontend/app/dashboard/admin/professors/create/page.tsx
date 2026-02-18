"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { apiClient } from "@/lib/api-client"
import { EntityFormPage } from "@/components/entity/entityFormPage"
import { ProfessorFields } from "./professorFields"
import type { UserType } from "@/lib/types"

export default function CreateProfessorPage() {
  const router = useRouter()

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    phone: "",
    address: "",
    date_of_birth: "",
    jmbg: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isValid =
    formData.first_name.trim().length >= 2 &&
    formData.last_name.trim().length >= 2 &&
    formData.email.trim().length > 0 &&
    formData.password.trim().length >= 8 &&
    formData.phone.trim().length > 0 &&
    formData.address.trim().length > 0
//    formData.date_of_birth.trim().length > 0

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const formatDateToISO = (dateString: string): string => {
    if (!dateString) return ""
    const date = new Date(dateString + "T12:00:00.000Z")
    return date.toISOString()
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!isValid) return

    setIsSubmitting(true)
    try {
      const formattedDateOfBirth = formatDateToISO(formData.date_of_birth)
      const payload = {
        ...formData,
        date_of_birth: formattedDateOfBirth,
        user_type: "PROFESSOR" as UserType,
      }
      await apiClient.register(payload)
      router.push("/dashboard/admin/professors")
    } catch (err) {
      console.error("Failed to create professor via register:", err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <EntityFormPage
      title="Create Professor"
      description="Register a new professor account"
      mainTitle="Professor Details"
      submitLabel="Create Professor"
      submittingLabel="Creating…"
      submitDisabled={!isValid || isSubmitting}
      onSubmit={handleSubmit}
      guidelines={[
        {
          title: "Account details",
          text: "Provide basic personal and contact information for the professor.",
        },
        {
          title: "Credentials",
          text: "Set a secure password and ensure JMBG is correct (13 digits).",
        },
      ]}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <ProfessorFields
          firstName={formData.first_name}
          lastName={formData.last_name}
          email={formData.email}
          password={formData.password}
          phone={formData.phone}
          address={formData.address}
          dateOfBirth={formData.date_of_birth}
          jmbg={formData.jmbg}
          onChange={handleChange}
          submitLabel="Create Professor"
          submitDisabled={!isValid || isSubmitting}
          isSubmitting={isSubmitting}
          onCancel={() => router.push("/dashboard/admin/professors")}
        />
      </form>
    </EntityFormPage>
  )
}

