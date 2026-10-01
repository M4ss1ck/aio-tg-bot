-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Bot" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "owner" TEXT NOT NULL,

    CONSTRAINT "Bot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "tg_id" TEXT NOT NULL,
    "rep" INTEGER NOT NULL,
    "nick" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "rango" TEXT,
    "lang" TEXT NOT NULL DEFAULT 'es',
    "model" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Filter" (
    "id" SERIAL NOT NULL,
    "filter" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "respuesta" TEXT NOT NULL,
    "global" BOOLEAN NOT NULL DEFAULT false,
    "chat" TEXT NOT NULL DEFAULT 'global',

    CONSTRAINT "Filter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Poll" (
    "id" TEXT NOT NULL,
    "chat" INTEGER NOT NULL,
    "question" TEXT NOT NULL,

    CONSTRAINT "Poll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Option" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "encuestaId" TEXT NOT NULL,

    CONSTRAINT "Option_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dictionary" (
    "id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Dictionary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Photo" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "caption" TEXT,
    "width" INTEGER,
    "height" INTEGER,

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Afk" (
    "id" TEXT NOT NULL,
    "username" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "msg" TEXT NOT NULL,

    CONSTRAINT "Afk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Bot_token_key" ON "Bot"("token");

-- CreateIndex
CREATE UNIQUE INDEX "User_tg_id_key" ON "User"("tg_id");

-- CreateIndex
CREATE UNIQUE INDEX "Filter_filter_chat_key" ON "Filter"("filter", "chat");

-- CreateIndex
CREATE UNIQUE INDEX "Dictionary_query_key" ON "Dictionary"("query");

-- AddForeignKey
ALTER TABLE "Option" ADD CONSTRAINT "Option_encuestaId_fkey" FOREIGN KEY ("encuestaId") REFERENCES "Poll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("tg_id") ON DELETE RESTRICT ON UPDATE CASCADE;
