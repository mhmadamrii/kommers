const dataServer = () => {
  'use server';

  return { data: 'This data comes from server' };
};

export default function Products() {
  console.log(dataServer());
  return (
    <main>
      <h1>Hello world</h1>
      <p>
        Lorem ipsum dolor sit, amet consectetur adipisicing elit. Vitae aliquam
        odit aspernatur ipsum deleniti consectetur voluptate sed voluptatibus ab
        debitis porro esse laudantium id corporis, architecto non ratione ad!
        Adipisci cupiditate tempore commodi at tempora impedit iste voluptas
        deleniti, ut aliquam. Debitis similique dolor, sed consectetur nam,
        repellendus saepe ad veniam quaerat doloribus accusantium, veritatis
        quae error. Ratione blanditiis delectus fugit temporibus unde alias
        architecto! Ea odio iure cum eveniet debitis laboriosam, omnis et culpa
        aperiam est? Natus neque corporis incidunt reprehenderit nulla eum sequi
        optio quam quisquam exercitationem tempore est iste debitis ipsam,
        dolores quidem assumenda delectus maxime fugiat distinctio eveniet quae!
        Accusamus reiciendis atque nisi libero facere nihil commodi eius minima
        quas iusto, nobis dolorem rem, odit nesciunt neque rerum, suscipit
        expedita laborum autem iure beatae animi ipsa quae? Ea animi maiores
        harum enim exercitationem explicabo ex veniam distinctio, vitae,
        eveniet, ratione obcaecati quos similique nam sunt. Explicabo suscipit
        dolore dolores eaque vitae excepturi, tenetur voluptate. Neque
        necessitatibus earum dicta tempore expedita sit commodi possimus amet,
        accusamus quas voluptates recusandae, quasi non quisquam rem illum.
        Deleniti vero aut placeat amet pariatur. Hic nesciunt voluptas est sint
        rem. Numquam nemo nostrum natus cupiditate! Nihil debitis vitae ipsam
        veritatis voluptatem expedita officiis a omnis dolore aperiam dolorum
        aliquam earum voluptas, aliquid iure dicta, quo ut ex voluptatum
        sapiente incidunt. Recusandae voluptatum dolore earum facilis itaque,
        illo tempore adipisci neque voluptatibus, aliquam, consectetur
        architecto modi harum distinctio exercitationem blanditiis. Rerum ipsum
        sapiente commodi veniam expedita tenetur modi amet earum autem, ut
        asperiores. Exercitationem, excepturi alias reprehenderit unde deleniti
        repellendus laborum, deserunt, eveniet numquam ipsum est quam eos ea
        odit odio iste vitae. Natus fuga deserunt suscipit similique cupiditate
        temporibus, dolore odio earum ipsam! Enim dolores quod iusto vel veniam
        ratione provident modi, explicabo sunt id nobis dolore omnis illo magnam
        dolor.
      </p>
    </main>
  );
}
