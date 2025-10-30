-- CreateTable
CREATE TABLE "Project" (
    "id" SERIAL NOT NULL,
    "project_key" TEXT NOT NULL,
    "project_name" TEXT NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Project_project_key_key" ON "Project"("project_key");
