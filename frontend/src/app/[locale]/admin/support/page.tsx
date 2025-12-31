"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MessageSquare,
  RefreshCw,
  Send,
  ArrowLeft,
  Clock,
  CheckCircle2,
  Loader2,
  User,
  Mail,
} from "lucide-react";
import {
  useGetAllTopicsAdminQuery,
  useGetTopicDetailAdminQuery,
  useAddAdminReplyMutation,
  useUpdateTopicStatusMutation,
  SupportTopicStatus,
  type SupportTopic,
} from "@/lib/api/support-api";
import { formatDistanceToNow } from "date-fns";

export default function AdminSupportPage() {
  const t = useTranslations("admin.support");
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // API hooks
  const {
    data: topics = [],
    isLoading: isLoadingTopics,
    refetch: refetchTopics,
  } = useGetAllTopicsAdminQuery();

  const {
    data: topicDetail,
    isLoading: isLoadingDetail,
    refetch: refetchDetail,
  } = useGetTopicDetailAdminQuery(selectedTopicId!, {
    skip: !selectedTopicId,
  });

  const [addReply, { isLoading: isSending }] = useAddAdminReplyMutation();
  const [updateStatus, { isLoading: isUpdatingStatus }] =
    useUpdateTopicStatusMutation();

  const handleSendReply = async () => {
    if (!selectedTopicId || !replyMessage.trim()) return;

    try {
      await addReply({
        topicId: selectedTopicId,
        message: { message: replyMessage.trim() },
      }).unwrap();

      setReplyMessage("");
      refetchDetail();
      refetchTopics();
    } catch (error) {
      console.error("Failed to send reply:", error);
    }
  };

  const handleStatusChange = async (newStatus: SupportTopicStatus) => {
    if (!selectedTopicId) return;

    try {
      await updateStatus({
        topicId: selectedTopicId,
        status: { status: newStatus },
      }).unwrap();

      refetchDetail();
      refetchTopics();
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  const getStatusBadge = (status: SupportTopicStatus) => {
    switch (status) {
      case SupportTopicStatus.OPEN:
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            <Clock className="w-3 h-3 mr-1" />
            {t("status.open")}
          </Badge>
        );
      case SupportTopicStatus.IN_PROGRESS:
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            <Loader2 className="w-3 h-3 mr-1" />
            {t("status.inProgress")}
          </Badge>
        );
      case SupportTopicStatus.RESOLVED:
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            {t("status.resolved")}
          </Badge>
        );
      default:
        return null;
    }
  };

  const filteredTopics = topics.filter((topic: SupportTopic) => {
    if (statusFilter === "all") return true;
    return topic.status === statusFilter;
  });

  // Topic detail view
  if (selectedTopicId && topicDetail) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedTopicId(null)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("backToList")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetchDetail()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            {t("refresh")}
          </Button>
        </div>

        <Card>
          <CardHeader className="border-b">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-xl mb-2">
                  {topicDetail.title}
                </CardTitle>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {topicDetail.user_name && (
                    <span className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      {topicDetail.user_name}
                    </span>
                  )}
                  {topicDetail.user_email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      {topicDetail.user_email}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("createdAt")}{" "}
                  {formatDistanceToNow(new Date(topicDetail.created_at), {
                    addSuffix: true,
                  })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={topicDetail.status}
                  onValueChange={(value) =>
                    handleStatusChange(value as SupportTopicStatus)
                  }
                  disabled={isUpdatingStatus}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SupportTopicStatus.OPEN}>
                      {t("status.open")}
                    </SelectItem>
                    <SelectItem value={SupportTopicStatus.IN_PROGRESS}>
                      {t("status.inProgress")}
                    </SelectItem>
                    <SelectItem value={SupportTopicStatus.RESOLVED}>
                      {t("status.resolved")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px] p-4">
              <div className="space-y-4">
                {topicDetail.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.is_admin_reply ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.is_admin_reply
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      {!message.is_admin_reply && (
                        <p className="text-xs font-semibold mb-1">
                          {message.user_name || t("user")}
                        </p>
                      )}
                      {message.is_admin_reply && (
                        <p className="text-xs font-semibold mb-1 text-primary-foreground/80">
                          {t("supportTeam")}
                        </p>
                      )}
                      <p className="text-sm whitespace-pre-wrap">
                        {message.message}
                      </p>
                      <p
                        className={`text-xs mt-1 ${
                          message.is_admin_reply
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground"
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

            <div className="border-t p-4">
              <div className="flex gap-2">
                <Textarea
                  placeholder={t("typeReply")}
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
          </CardContent>
        </Card>
      </div>
    );
  }

  // Topics list view
  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t("filterBy")}:</span>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filter.all")}</SelectItem>
              <SelectItem value={SupportTopicStatus.OPEN}>
                {t("status.open")}
              </SelectItem>
              <SelectItem value={SupportTopicStatus.IN_PROGRESS}>
                {t("status.inProgress")}
              </SelectItem>
              <SelectItem value={SupportTopicStatus.RESOLVED}>
                {t("status.resolved")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetchTopics()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          {t("refresh")}
        </Button>
      </div>

      {isLoadingTopics ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredTopics.length === 0 ? (
        <Card className="p-12 text-center">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">{t("noTopics")}</h3>
          <p className="text-muted-foreground">{t("noTopicsDescription")}</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredTopics.map((topic: SupportTopic) => (
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
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-1">
                      {topic.user_name && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {topic.user_name}
                        </span>
                      )}
                      {topic.user_email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {topic.user_email}
                        </span>
                      )}
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
                  <MessageSquare className="w-5 h-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
