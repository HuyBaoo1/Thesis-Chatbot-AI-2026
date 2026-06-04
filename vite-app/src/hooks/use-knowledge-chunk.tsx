import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  createKnowledgeChunk,
  deleteKnowledgeChunk,
  deleteUploadedKnowledgeChunkFile,
  getKnowledgeChunks,
  getUploadedKnowledgeChunkFiles,
  rebuildMissingEmbeddings,
  uploadKnowledgeChunkFile,
  updateKnowledgeChunk,
  updateKnowledgeChunkStatus,
} from "@/api/knowledge-chunk-api"
import type {
  KnowledgeChunkListParams,
  KnowledgeChunkUploadedFileListParams,
  UpdateKnowledgeChunkPayload,
} from "@/types/knowledge-chunk-type"

const useKnowledgeChunk = (
  params: KnowledgeChunkListParams,
  uploadedFileParams: KnowledgeChunkUploadedFileListParams = { limit: 20 }
) => {
  const queryClient = useQueryClient()

  const knowledgeChunkQuery = useQuery({
    queryKey: ["knowledge-chunks", params],
    queryFn: () => getKnowledgeChunks(params),
    placeholderData: (previousData) => previousData,
  })

  const uploadedFilesQuery = useQuery({
    queryKey: ["knowledge-chunk-uploaded-files", uploadedFileParams],
    queryFn: () => getUploadedKnowledgeChunkFiles(uploadedFileParams),
    placeholderData: (previousData) => previousData,
  })

  const createKnowledgeChunkMutation = useMutation({
    mutationFn: createKnowledgeChunk,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["knowledge-chunks"] })
    },
  })

  const updateKnowledgeChunkMutation = useMutation({
    mutationFn: ({
      chunkId,
      values,
    }: {
      chunkId: string
      values: UpdateKnowledgeChunkPayload
    }) => updateKnowledgeChunk(chunkId, values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["knowledge-chunks"] })
    },
  })

  const updateKnowledgeChunkStatusMutation = useMutation({
    mutationFn: ({ chunkId, is_active }: { chunkId: string; is_active: boolean }) =>
      updateKnowledgeChunkStatus(chunkId, { is_active }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["knowledge-chunks"] })
    },
  })

  const deleteKnowledgeChunkMutation = useMutation({
    mutationFn: (chunkId: string) => deleteKnowledgeChunk(chunkId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["knowledge-chunks"] })
    },
  })

  const uploadKnowledgeChunkFileMutation = useMutation({
    mutationFn: uploadKnowledgeChunkFile,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["knowledge-chunks"] })
      await queryClient.invalidateQueries({
        queryKey: ["knowledge-chunk-uploaded-files"],
      })
    },
  })

  const deleteUploadedKnowledgeChunkFileMutation = useMutation({
    mutationFn: deleteUploadedKnowledgeChunkFile,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["knowledge-chunks"] })
      await queryClient.invalidateQueries({
        queryKey: ["knowledge-chunk-uploaded-files"],
      })
    },
  })

  const rebuildMissingEmbeddingsMutation = useMutation({
    mutationFn: rebuildMissingEmbeddings,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["knowledge-chunks"] })
    },
  })

  return {
    knowledgeChunkList: knowledgeChunkQuery.data,
    knowledgeChunkListPending: knowledgeChunkQuery.isLoading,
    knowledgeChunkListFetching: knowledgeChunkQuery.isFetching,
    uploadedKnowledgeChunkFileList: uploadedFilesQuery.data,
    uploadedKnowledgeChunkFileListPending: uploadedFilesQuery.isLoading,
    uploadedKnowledgeChunkFileListFetching: uploadedFilesQuery.isFetching,
    createKnowledgeChunk: createKnowledgeChunkMutation.mutateAsync,
    createKnowledgeChunkPending: createKnowledgeChunkMutation.isPending,
    updateKnowledgeChunk: updateKnowledgeChunkMutation.mutateAsync,
    updateKnowledgeChunkPending: updateKnowledgeChunkMutation.isPending,
    updateKnowledgeChunkStatus: updateKnowledgeChunkStatusMutation.mutateAsync,
    updateKnowledgeChunkStatusPending: updateKnowledgeChunkStatusMutation.isPending,
    deleteKnowledgeChunk: deleteKnowledgeChunkMutation.mutateAsync,
    deleteKnowledgeChunkPending: deleteKnowledgeChunkMutation.isPending,
    uploadKnowledgeChunkFile: uploadKnowledgeChunkFileMutation.mutateAsync,
    uploadKnowledgeChunkFilePending: uploadKnowledgeChunkFileMutation.isPending,
    deleteUploadedKnowledgeChunkFile:
      deleteUploadedKnowledgeChunkFileMutation.mutateAsync,
    deleteUploadedKnowledgeChunkFilePending:
      deleteUploadedKnowledgeChunkFileMutation.isPending,
    rebuildMissingEmbeddings: rebuildMissingEmbeddingsMutation.mutateAsync,
    rebuildMissingEmbeddingsPending: rebuildMissingEmbeddingsMutation.isPending,
  }
}

export default useKnowledgeChunk
