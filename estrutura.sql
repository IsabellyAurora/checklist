--
-- PostgreSQL database dump
--

\restrict Caz3AA5MfKDqErsvHzsQyuotq0LFfLCJmeNJk5NUGsqveZDOOpi82flKACbqSA3

-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

-- Started on 2026-08-31 09:53:30

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 222 (class 1259 OID 16413)
-- Name: checklist; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.checklist (
    id_checklist integer NOT NULL,
    titulo character varying(150) NOT NULL,
    ativo boolean DEFAULT true,
    data_criacao timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.checklist OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 16412)
-- Name: checklist_id_checklist_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.checklist_id_checklist_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.checklist_id_checklist_seq OWNER TO postgres;

--
-- TOC entry 5011 (class 0 OID 0)
-- Dependencies: 221
-- Name: checklist_id_checklist_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.checklist_id_checklist_seq OWNED BY public.checklist.id_checklist;


--
-- TOC entry 226 (class 1259 OID 16444)
-- Name: execucao; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.execucao (
    id_execucao integer NOT NULL,
    id_checklist integer NOT NULL,
    id_usuario integer NOT NULL,
    status character varying(50) DEFAULT 'EM_ANDAMENTO'::character varying,
    data_inicio timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    data_conclusao timestamp with time zone
);


ALTER TABLE public.execucao OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 16443)
-- Name: execucao_id_execucao_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.execucao_id_execucao_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.execucao_id_execucao_seq OWNER TO postgres;

--
-- TOC entry 5012 (class 0 OID 0)
-- Dependencies: 225
-- Name: execucao_id_execucao_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.execucao_id_execucao_seq OWNED BY public.execucao.id_execucao;


--
-- TOC entry 224 (class 1259 OID 16424)
-- Name: item; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.item (
    id_item integer NOT NULL,
    id_checklist integer NOT NULL,
    ordem integer NOT NULL,
    descricao text NOT NULL,
    tipo character varying(50) NOT NULL,
    obrigatorio boolean DEFAULT true
);


ALTER TABLE public.item OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 16423)
-- Name: item_id_item_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.item_id_item_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.item_id_item_seq OWNER TO postgres;

--
-- TOC entry 5013 (class 0 OID 0)
-- Dependencies: 223
-- Name: item_id_item_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.item_id_item_seq OWNED BY public.item.id_item;


--
-- TOC entry 228 (class 1259 OID 16466)
-- Name: resposta; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.resposta (
    id_resposta integer NOT NULL,
    id_execucao integer NOT NULL,
    id_item integer NOT NULL,
    valor_resposta text,
    observacao text
);


ALTER TABLE public.resposta OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 16465)
-- Name: resposta_id_resposta_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.resposta_id_resposta_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.resposta_id_resposta_seq OWNER TO postgres;

--
-- TOC entry 5014 (class 0 OID 0)
-- Dependencies: 227
-- Name: resposta_id_resposta_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.resposta_id_resposta_seq OWNED BY public.resposta.id_resposta;


--
-- TOC entry 220 (class 1259 OID 16400)
-- Name: usuario; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usuario (
    id_usuario integer NOT NULL,
    nome character varying(100) NOT NULL,
    email character varying(150) NOT NULL,
    data_cadastro timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    senha character varying(255) NOT NULL,
    setor character varying(100)
);


ALTER TABLE public.usuario OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 16399)
-- Name: usuario_id_usuario_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.usuario_id_usuario_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.usuario_id_usuario_seq OWNER TO postgres;

--
-- TOC entry 5015 (class 0 OID 0)
-- Dependencies: 219
-- Name: usuario_id_usuario_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.usuario_id_usuario_seq OWNED BY public.usuario.id_usuario;


--
-- TOC entry 4831 (class 2604 OID 16416)
-- Name: checklist id_checklist; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.checklist ALTER COLUMN id_checklist SET DEFAULT nextval('public.checklist_id_checklist_seq'::regclass);


--
-- TOC entry 4836 (class 2604 OID 16447)
-- Name: execucao id_execucao; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.execucao ALTER COLUMN id_execucao SET DEFAULT nextval('public.execucao_id_execucao_seq'::regclass);


--
-- TOC entry 4834 (class 2604 OID 16427)
-- Name: item id_item; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.item ALTER COLUMN id_item SET DEFAULT nextval('public.item_id_item_seq'::regclass);


--
-- TOC entry 4839 (class 2604 OID 16469)
-- Name: resposta id_resposta; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resposta ALTER COLUMN id_resposta SET DEFAULT nextval('public.resposta_id_resposta_seq'::regclass);


--
-- TOC entry 4829 (class 2604 OID 16403)
-- Name: usuario id_usuario; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario ALTER COLUMN id_usuario SET DEFAULT nextval('public.usuario_id_usuario_seq'::regclass);


--
-- TOC entry 4845 (class 2606 OID 16422)
-- Name: checklist checklist_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.checklist
    ADD CONSTRAINT checklist_pkey PRIMARY KEY (id_checklist);


--
-- TOC entry 4849 (class 2606 OID 16454)
-- Name: execucao execucao_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.execucao
    ADD CONSTRAINT execucao_pkey PRIMARY KEY (id_execucao);


--
-- TOC entry 4847 (class 2606 OID 16437)
-- Name: item item_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.item
    ADD CONSTRAINT item_pkey PRIMARY KEY (id_item);


--
-- TOC entry 4851 (class 2606 OID 16476)
-- Name: resposta resposta_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resposta
    ADD CONSTRAINT resposta_pkey PRIMARY KEY (id_resposta);


--
-- TOC entry 4853 (class 2606 OID 16478)
-- Name: resposta uk_execucao_item; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resposta
    ADD CONSTRAINT uk_execucao_item UNIQUE (id_execucao, id_item);


--
-- TOC entry 4841 (class 2606 OID 16411)
-- Name: usuario usuario_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_email_key UNIQUE (email);


--
-- TOC entry 4843 (class 2606 OID 16409)
-- Name: usuario usuario_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_pkey PRIMARY KEY (id_usuario);


--
-- TOC entry 4855 (class 2606 OID 16455)
-- Name: execucao fk_execucao_checklist; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.execucao
    ADD CONSTRAINT fk_execucao_checklist FOREIGN KEY (id_checklist) REFERENCES public.checklist(id_checklist) ON DELETE RESTRICT;


--
-- TOC entry 4856 (class 2606 OID 16460)
-- Name: execucao fk_execucao_usuario; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.execucao
    ADD CONSTRAINT fk_execucao_usuario FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario) ON DELETE RESTRICT;


--
-- TOC entry 4854 (class 2606 OID 16438)
-- Name: item fk_item_checklist; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.item
    ADD CONSTRAINT fk_item_checklist FOREIGN KEY (id_checklist) REFERENCES public.checklist(id_checklist) ON DELETE CASCADE;


--
-- TOC entry 4857 (class 2606 OID 16479)
-- Name: resposta fk_resposta_execucao; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resposta
    ADD CONSTRAINT fk_resposta_execucao FOREIGN KEY (id_execucao) REFERENCES public.execucao(id_execucao) ON DELETE CASCADE;


--
-- TOC entry 4858 (class 2606 OID 16484)
-- Name: resposta fk_resposta_item; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resposta
    ADD CONSTRAINT fk_resposta_item FOREIGN KEY (id_item) REFERENCES public.item(id_item) ON DELETE RESTRICT;


-- Completed on 2026-08-31 09:53:31

--
-- PostgreSQL database dump complete
--

\unrestrict Caz3AA5MfKDqErsvHzsQyuotq0LFfLCJmeNJk5NUGsqveZDOOpi82flKACbqSA3

