"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  MessageCircle,
  Plus,
  RefreshCw,
  Send,
  ArrowLeft,
  Clock,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import {
  useCreateTopicMutation,
  useGetUserTopicsQuery,
  useGetTopicDetailQuery,
  useAddMessageMutation,
  SupportTopicStatus,
  type SupportTopic,
} from "@/lib/api/support-api";
import { formatDistanceToNow } from "date-fns";

export default function HelpCenterPage() {
  const t = useTranslations("help");
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [isNewTopicDialogOpen, setIsNewTopicDialogOpen] = useState(false);
  const [newTopicTitle, setNewTopicTitle] = useState("");
  const [newTopicMessage, setNewTopicMessage] = useState("");
  const [replyMessage, setReplyMessage] = useState("");

  // API hooks
  const {
    data: topics = [],
    isLoading: isLoadingTopics,
    refetch: refetchTopics,
  } = useGetUserTopicsQuery();

  const {
    data: topicDetail,
    isLoading: isLoadingDetail,
    refetch: refetchDetail,
  } = useGetTopicDetailQuery(selectedTopicId!, {
    skip: !selectedTopicId,
  });

  const [createTopic, { isLoading: isCreating }] = useCreateTopicMutation();
  const [addMessage, { isLoading: isSending }] = useAddMessageMutation();

  const handleCreateTopic = async () => {
    if (!newTopicTitle.trim() || !newTopicMessage.trim()) return;

    try {
      await createTopic({
        title: newTopicTitle.trim(),
        message: newTopicMessage.trim(),
      }).unwrap();

      setNewTopicTitle("");
      setNewTopicMessage("");
      setIsNewTopicDialogOpen(false);
      refetchTopics();
    } catch (error) {
      console.error("Failed to create topic:", error);
    }
  };

  const handleSendReply = async () => {
    if (!selectedTopicId || !replyMessage.trim()) return;

    try {
      await addMessage({
        topicId: selectedTopicId,
        message: { message: replyMessage.trim() },
      }).unwrap();

      setReplyMessage("");
      refetchDetail();
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const getStatusBadge = (status: SupportTopicStatus) => {
    switch (status) {
      case SupportTopicStatus.OPEN:
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            <Clock className="w-3 h-3 mr-1" />
            {t("status.open")}
          </Badge>
        );
      case SupportTopicStatus.IN_PROGRESS:
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <Loader2 className="w-3 h-3 mr-1" />
            {t("status.inProgress")}
          </Badge>
        );
      case SupportTopicStatus.RESOLVED:
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            {t("status.resolved")}
          </Badge>
        );
      default:
        return null;
    }
  };

  // Topic detail view
  if (selectedTopicId && topicDetail) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedTopicId(null)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("backToTopics")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetchDetail()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            {t("refresh")}
          </Button>
        </div>

        <Card>
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">{topicDetail.title}</CardTitle>
              {getStatusBadge(topicDetail.status)}
            </div>
            <p className="text-sm text-muted-foreground">
              {t("createdAt")}{" "}
              {formatDistanceToNow(new Date(topicDetail.created_at), {
                addSuffix: true,
              })}
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px] p-4">
              <div className="space-y-4">
                {topicDetail.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.is_admin_reply ? "justify-start" : "justify-end"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.is_admin_reply
                          ? "bg-muted"
                          : "bg-primary text-primary-foreground"
                      }`}
                    >
                      {message.is_admin_reply && (
                        <p className="text-xs font-semibold mb-1">
                          {t("supportTeam")}
                        </p>
                      )}
                      <p className="text-sm whitespace-pre-wrap">
                        {message.message}
                      </p>
                      <p
                        className={`text-xs mt-1 ${
                          message.is_admin_reply
                            ? "text-muted-foreground"
                            : "text-primary-foreground/70"
                        }`}
                      >
                        {formatDistanceToNow(new Date(message.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {topicDetail.status !== SupportTopicStatus.RESOLVED && (
              <div className="border-t p-4">
                <div className="flex gap-2">
                  <Textarea
                    placeholder={t("typeMessage")}
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    className="flex-1 min-h-[80px]"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && e.ctrlKey) {
                        handleSendReply();
                      }
                    }}
                  />
                  <Button
                    onClick={handleSendReply}
                    disabled={!replyMessage.trim() || isSending}
                  >
                    {isSending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {t("pressCtrlEnter")}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Topics list view
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetchTopics()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            {t("refresh")}
          </Button>
          <Dialog
            open={isNewTopicDialogOpen}
            onOpenChange={setIsNewTopicDialogOpen}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                {t("newTopic")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("createTopic")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">{t("topicTitle")}</label>
                  <Input
                    placeholder={t("topicTitlePlaceholder")}
                    value={newTopicTitle}
                    onChange={(e) => setNewTopicTitle(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">{t("messageLabel")}</label>
                  <Textarea
                    placeholder={t("messagePlaceholder")}
                    value={newTopicMessage}
                    onChange={(e) => setNewTopicMessage(e.target.value)}
                    className="mt-1 min-h-[120px]"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsNewTopicDialogOpen(false)}
                  >
                    {t("cancel")}
                  </Button>
                  <Button
                    onClick={handleCreateTopic}
                    disabled={
                      !newTopicTitle.trim() ||
                      !newTopicMessage.trim() ||
                      isCreating
                    }
                  >
                    {isCreating ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : null}
                    {t("create")}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoadingTopics ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : topics.length === 0 ? (
        <Card className="p-12 text-center">
          <MessageCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">{t("noTopics")}</h3>
          <p className="text-muted-foreground mb-4">{t("noTopicsDescription")}</p>
          <Button onClick={() => setIsNewTopicDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t("createFirstTopic")}
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {topics.map((topic: SupportTopic) => (
            <Card
              key={topic.id}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => setSelectedTopicId(topic.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{topic.title}</h3>
                      {getStatusBadge(topic.status)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>
                        {topic.message_count}{" "}
                        {topic.message_count === 1
                          ? t("message")
                          : t("messages")}
                      </span>
                      <span>
                        {t("lastActivity")}{" "}
                        {formatDistanceToNow(
                          new Date(topic.last_message_at || topic.updated_at),
                          { addSuffix: true }
                        )}
                      </span>
                    </div>
                  </div>
                  <MessageCircle className="w-5 h-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
