-- เรื่องที่สร้างใต้การประชุม/โครงการของอนุฯ แต่ไม่ได้เลือกอนุฯ ไว้ จะไม่มีหน่วยงานที่ต้องรายงาน
-- ผูกกับอนุฯ เจ้าของที่มาให้ (เฉพาะเรื่องที่ยังไม่มีอนุฯ เลย)
INSERT INTO "ProposalSubCommittee" ("proposalId", "subCommitteeId")
SELECT p."id", f."subCommitteeId"
FROM "Proposal" p
JOIN "Festival" f ON f."id" = p."festivalId"
WHERE f."subCommitteeId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "ProposalSubCommittee" ps WHERE ps."proposalId" = p."id");
